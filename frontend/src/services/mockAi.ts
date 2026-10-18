import type { AiClient } from './api'
import type { Category, Item, Locale, Source, SplitChatItem, Tag } from '@/types'

/**
 * Deterministic heuristics that simulate AI output so the UI can be built
 * and tested without a model. Replace with real endpoints in httpApi.ts.
 */

const STOP = new Set(
  'a an the and or of to in on for with is are be this that it as at by from me my i you your we our how what why can do does write give make create into about here these those than then them they'.split(
    ' ',
  ),
)

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !STOP.has(w))
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[#>*_|[\]()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstSentence(text: string): string {
  const clean = stripMarkdown(text)
  const m = clean.match(/^(.{8,140}?[.!?])(\s|$)/)
  return (m ? m[1] : clean.slice(0, 80)).trim()
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const KEYWORDS: Record<string, string[]> = {
  react: ['react', 'component', 'hooks', 'jsx', 'tsx', 'usestate', 'useeffect'],
  sql: ['sql', 'postgres', 'query', 'index', 'select', 'join', 'window'],
  python: ['python', 'pandas', 'pytest', 'fastapi', 'django', 'numpy'],
  email: ['email', 'subject', 'inbox', 'outreach', 'message', 'client'],
  copywriting: ['headline', 'copy', 'landing', 'tagline', 'hero', 'tone'],
  refactor: ['refactor', 'rewrite', 'clean', 'convert', 'regex', 'migrate'],
  research: ['research', 'paper', 'interview', 'study', 'summarize', 'learn'],
  strategy: ['strategy', 'positioning', 'prd', 'backlog', 'roadmap', 'prioritize'],
  writing: ['write', 'draft', 'email', 'copy', 'tone', 'story'],
  coding: ['code', 'function', 'bug', 'test', 'regex', 'sql', 'react', 'python'],
  product: ['product', 'feature', 'prd', 'backlog', 'roadmap', 'meeting', 'users'],
  learning: ['explain', 'teach', 'tutor', 'learn', 'quiz', 'cheat'],
}

function scoreNames(names: string[], text: string): string[] {
  const tokens = tokenize(text)
  const bag = new Set(tokens)
  return names
    .map((name) => {
      const key = name.toLowerCase()
      const words = KEYWORDS[key] ?? [key]
      const score = words.reduce((s, w) => s + (bag.has(w) ? 2 : 0), 0) + (bag.has(key) ? 3 : 0)
      return { name, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.name)
}

const IMPROVE_LABELS: Record<Locale, { role: string; task: string; context: string; format: string; constraints: string; roleText: string; formatText: string; constraintsText: string; contextText: string }> = {
  en: {
    role: 'Role',
    task: 'Task',
    context: 'Context',
    format: 'Output format',
    constraints: 'Constraints',
    roleText: 'You are a careful domain expert.',
    contextText: '{{paste relevant context here}}',
    formatText: 'Use short headings and bullet points. Start with the answer, then the reasoning.',
    constraintsText: 'If information is missing, ask one clarifying question before answering. Do not invent facts.',
  },
  ru: {
    role: 'Роль',
    task: 'Задача',
    context: 'Контекст',
    format: 'Формат ответа',
    constraints: 'Ограничения',
    roleText: 'Ты — внимательный эксперт в этой области.',
    contextText: '{{вставьте нужный контекст}}',
    formatText: 'Короткие заголовки и списки. Сначала ответ, затем рассуждение.',
    constraintsText: 'Если не хватает данных, задай один уточняющий вопрос. Не выдумывай факты.',
  },
  kk: {
    role: 'Рөл',
    task: 'Тапсырма',
    context: 'Контекст',
    format: 'Жауап форматы',
    constraints: 'Шектеулер',
    roleText: 'Сен — осы саладағы мұқият сарапшысың.',
    contextText: '{{қажетті контекстті осында қойыңыз}}',
    formatText: 'Қысқа тақырыпшалар мен тізімдер қолдан. Алдымен жауап, содан кейін түсіндірме.',
    constraintsText: 'Деректер жетіспесе, бір нақтылау сұрағын қой. Фактілерді ойдан шығарма.',
  },
}

const ASK_TEMPLATES: Record<Locale, { found: (n: number) => string; none: string; lead: string }> = {
  en: {
    found: (n) => `I found ${n} item${n === 1 ? '' : 's'} in your library that match.`,
    none: 'I could not find anything in your library about that yet. Try different words, or save a new item first.',
    lead: 'Most relevant:',
  },
  ru: {
    found: (n) => `Нашёл в вашей библиотеке подходящие записи: ${n}.`,
    none: 'В библиотеке пока нет ничего по этой теме. Попробуйте другие слова или сохраните новую запись.',
    lead: 'Самое релевантное:',
  },
  kk: {
    found: (n) => `Кітапханаңыздан сәйкес келетін жазбалар табылды: ${n}.`,
    none: 'Кітапханада бұл тақырып бойынша әзірге ештеңе жоқ. Басқа сөздермен іздеп көріңіз немесе жаңа жазба сақтаңыз.',
    lead: 'Ең қатыстысы:',
  },
}

const SPEAKER_RE =
  /^\s*(?:\*\*)?(you|user|me|human|я|вы|сіз|мен|chatgpt|gpt-?\d*o?|assistant|ai|claude|gemini|bard|ассистент|көмекші)(?:\*\*)?\s*[:：]\s*/i

function speakerToSource(label: string): Source | null {
  const l = label.toLowerCase()
  if (l.startsWith('chatgpt') || l.startsWith('gpt')) return 'chatgpt'
  if (l === 'claude') return 'claude'
  if (l === 'gemini' || l === 'bard') return 'gemini'
  return null
}

function isUser(label: string): boolean {
  return ['you', 'user', 'me', 'human', 'я', 'вы', 'сіз', 'мен'].includes(label.toLowerCase())
}

export function splitChatText(raw: string): SplitChatItem[] {
  const turns: { user: boolean; label: string; text: string[] }[] = []
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(SPEAKER_RE)
    if (m) {
      turns.push({ user: isUser(m[1]), label: m[1], text: [line.slice(m[0].length)] })
    } else if (turns.length) {
      turns[turns.length - 1].text.push(line)
    } else if (line.trim()) {
      turns.push({ user: true, label: 'you', text: [line] })
    }
  }

  const items: SplitChatItem[] = []
  let current: SplitChatItem | null = null
  let detected: Source = 'other'
  for (const turn of turns) {
    const body = turn.text.join('\n').trim()
    if (!body) continue
    if (turn.user) {
      if (current) items.push(current)
      current = { title: titleCase(firstSentence(body)).replace(/[.!?]$/, ''), prompt: body, response: '', source: detected }
    } else {
      detected = speakerToSource(turn.label) ?? detected
      if (!current) current = { title: titleCase(firstSentence(body)), prompt: '', response: body, source: detected }
      else {
        current.response = current.response ? `${current.response}\n\n${body}` : body
        current.source = detected
      }
    }
  }
  if (current) items.push(current)
  return items.map((i) => ({ ...i, title: i.title.slice(0, 80) || 'Untitled' }))
}

export function rankItems(items: Item[], question: string): Item[] {
  const q = tokenize(question)
  if (!q.length) return []
  return items
    .map((item) => {
      const title = new Set(tokenize(item.title))
      const body = tokenize(`${item.prompt} ${item.response} ${item.notes}`)
      const bodySet = new Set(body)
      const score = q.reduce((s, w) => s + (title.has(w) ? 3 : 0) + (bodySet.has(w) ? 1 : 0), 0)
      return { item, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
}

export function createMockAi(deps: {
  delay: () => Promise<void>
  getItems: () => Item[]
  getTags: () => Tag[]
  getCategories: () => Category[]
}): AiClient {
  return {
    async suggestTitles({ prompt, response }) {
      await deps.delay()
      const base = firstSentence(prompt || response).replace(/[.!?]$/, '')
      const words = tokenize(prompt).slice(0, 4)
      const short = words.length ? titleCase(words.join(' ')) : base
      const out = [titleCase(base).slice(0, 70), short, words.length > 1 ? `${titleCase(words[0])}: ${words.slice(1).join(' ')}` : '']
      return Array.from(new Set(out.filter(Boolean)))
    },
    async summarize({ prompt, response }) {
      await deps.delay()
      const src = response || prompt
      const clean = stripMarkdown(src)
      const sentences = clean.match(/[^.!?]+[.!?]/g) ?? [clean]
      return sentences.slice(0, 2).join(' ').trim().slice(0, 280)
    },
    async suggestTags({ prompt, response }) {
      await deps.delay()
      return scoreNames(
        deps.getTags().map((t) => t.name),
        `${prompt} ${response}`,
      ).slice(0, 4)
    },
    async suggestCategories({ prompt, response }) {
      await deps.delay()
      return scoreNames(
        deps.getCategories().map((c) => c.name),
        `${prompt} ${response}`,
      ).slice(0, 2)
    },
    async improvePrompt({ prompt, locale }) {
      await deps.delay()
      const L = IMPROVE_LABELS[locale] ?? IMPROVE_LABELS.en
      return [
        `## ${L.role}\n${L.roleText}`,
        `## ${L.task}\n${prompt.trim()}`,
        `## ${L.context}\n${L.contextText}`,
        `## ${L.format}\n${L.formatText}`,
        `## ${L.constraints}\n${L.constraintsText}`,
      ].join('\n\n')
    },
    async splitChat({ raw }) {
      await deps.delay()
      return splitChatText(raw)
    },
    async askLibrary({ question, locale }) {
      await deps.delay()
      const T = ASK_TEMPLATES[locale] ?? ASK_TEMPLATES.en
      const top = rankItems(deps.getItems(), question).slice(0, 3)
      if (!top.length) return { answer: T.none, citations: [] }
      const lines = top.map((item, i) => `${i + 1}. **${item.title}** — ${firstSentence(item.response || item.prompt)} [${i + 1}]`)
      return {
        answer: `${T.found(top.length)}\n\n${T.lead}\n\n${lines.join('\n')}`,
        citations: top.map((i) => ({ itemId: i.id, title: i.title })),
      }
    },
  }
}
