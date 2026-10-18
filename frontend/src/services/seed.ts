import type { ColorKey, Source } from '@/types'

export interface SeedTag {
  id: string
  name: string
  color: ColorKey
}
export interface SeedCollection {
  id: string
  name: string
  description: string
  createdAt: string
}
export interface SeedItem {
  id: string
  title: string
  prompt: string
  response: string
  source: Source
  categoryId: string | null
  tagIds: string[]
  collectionIds: string[]
  notes: string
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export const seedTags: SeedTag[] = [
  { id: 'tag-react', name: 'react', color: 'blue' },
  { id: 'tag-sql', name: 'sql', color: 'teal' },
  { id: 'tag-copywriting', name: 'copywriting', color: 'pink' },
  { id: 'tag-refactor', name: 'refactor', color: 'violet' },
  { id: 'tag-email', name: 'email', color: 'amber' },
  { id: 'tag-research', name: 'research', color: 'green' },
  { id: 'tag-python', name: 'python', color: 'indigo' },
  { id: 'tag-strategy', name: 'strategy', color: 'red' },
]

export const seedCategories: SeedTag[] = [
  { id: 'cat-coding', name: 'Coding', color: 'indigo' },
  { id: 'cat-writing', name: 'Writing', color: 'pink' },
  { id: 'cat-research', name: 'Research', color: 'green' },
  { id: 'cat-product', name: 'Product', color: 'amber' },
  { id: 'cat-learning', name: 'Learning', color: 'teal' },
]

export const seedCollections: SeedCollection[] = [
  {
    id: 'col-eng',
    name: 'Engineering playbook',
    description: 'Battle-tested prompts for code review, refactors and debugging.',
    createdAt: '2026-06-02T09:00:00.000Z',
  },
  {
    id: 'col-launch',
    name: 'Launch kit',
    description: 'Copy, emails and positioning for the Q4 product launch.',
    createdAt: '2026-07-14T09:00:00.000Z',
  },
  {
    id: 'col-study',
    name: 'Study notes',
    description: 'Explanations worth re-reading.',
    createdAt: '2026-08-21T09:00:00.000Z',
  },
]

const d = (day: number, hour = 10) => new Date(Date.UTC(2026, 8, day, hour, 0, 0)).toISOString()

type Raw = Omit<SeedItem, 'id' | 'createdAt' | 'updatedAt' | 'notes' | 'favorite'> & {
  notes?: string
  favorite?: boolean
}

const raw: Raw[] = [
  {
    title: 'Senior code review checklist',
    prompt:
      'Act as a senior React reviewer. Review the following component for correctness, accessibility, performance and naming. Return a prioritized list: blockers, suggestions, nitpicks.\n\n```tsx\n{{code}}\n```',
    response:
      '## Blockers\n1. `useEffect` fetches without an abort signal — race condition on fast prop changes.\n2. The clickable `div` has no role or keyboard handler.\n\n## Suggestions\n- Derive `isEmpty` instead of storing it in state.\n- Memoize the filtered list only if profiling shows a cost.\n\n## Nitpicks\n- `handleClick2` → `handleArchive`.',
    source: 'claude',
    categoryId: 'cat-coding',
    tagIds: ['tag-react', 'tag-refactor'],
    collectionIds: ['col-eng'],
    favorite: true,
    notes: 'Works best when the component is under 200 lines.',
  },
  {
    title: 'Explain a slow Postgres query',
    prompt:
      'Here is an EXPLAIN ANALYZE output from Postgres 16. Explain in plain language where the time goes and propose up to three indexes or rewrites, ranked by expected impact.\n\n{{explain_output}}',
    response:
      'Most of the time (≈ 82%) is spent in a **sequential scan** on `orders` filtered by `customer_id` and `status`.\n\n1. `CREATE INDEX ON orders (customer_id, status) INCLUDE (total);` — turns the scan into an index-only scan.\n2. Replace `NOT IN (subquery)` with `NOT EXISTS` to avoid the hashed subplan.\n3. Raise `work_mem` for this session; the sort spills to disk (external merge, 48MB).',
    source: 'chatgpt',
    categoryId: 'cat-coding',
    tagIds: ['tag-sql'],
    collectionIds: ['col-eng'],
    favorite: true,
  },
  {
    title: 'Refactor class component to hooks',
    prompt:
      'Convert this React class component to a function component with hooks. Keep behaviour identical, preserve prop types, and explain each lifecycle mapping in a short table.',
    response:
      '| Class | Hooks |\n|---|---|\n| `componentDidMount` | `useEffect(() => {...}, [])` |\n| `componentDidUpdate(prev)` | `useEffect` with deps |\n| `componentWillUnmount` | cleanup returned from `useEffect` |\n| `this.state` | `useState` / `useReducer` |\n\nThe refactored component is below…',
    source: 'chatgpt',
    categoryId: 'cat-coding',
    tagIds: ['tag-react', 'tag-refactor'],
    collectionIds: ['col-eng'],
  },
  {
    title: 'Pandas: tidy messy CSV',
    prompt:
      'I have a CSV with merged header rows, thousands separators and dates in mixed formats. Write a pandas pipeline that cleans it into a tidy DataFrame. Use method chaining.',
    response:
      '```python\ndf = (\n    pd.read_csv(path, header=[0, 1], thousands=",")\n      .pipe(flatten_columns)\n      .assign(date=lambda d: pd.to_datetime(d["date"], format="mixed", dayfirst=True))\n      .dropna(how="all")\n      .reset_index(drop=True)\n)\n```',
    source: 'gemini',
    categoryId: 'cat-coding',
    tagIds: ['tag-python'],
    collectionIds: [],
  },
  {
    title: 'Write pytest fixtures for a FastAPI app',
    prompt:
      'Write pytest fixtures for a FastAPI app that uses SQLAlchemy 2.0 async sessions. Each test should run in a rolled-back transaction.',
    response:
      'Use a session-scoped engine, a function-scoped connection that begins a transaction, and override the `get_session` dependency so the app shares that connection. Roll back in teardown.',
    source: 'claude',
    categoryId: 'cat-coding',
    tagIds: ['tag-python'],
    collectionIds: ['col-eng'],
  },
  {
    title: 'Landing page hero — three variants',
    prompt:
      'Write three hero headline + subheadline pairs for a calm, premium note-taking app for AI prompts. Tone: confident, plain, no hype words like "revolutionary".',
    response:
      '1. **Every good prompt, on one shelf.** Save the prompts and answers that worked, and find them in a second.\n2. **Stop losing your best prompts.** A quiet library for everything you have asked an AI.\n3. **Your AI work, organized.** Capture, tag and export chats from any model.',
    source: 'claude',
    categoryId: 'cat-writing',
    tagIds: ['tag-copywriting'],
    collectionIds: ['col-launch'],
    favorite: true,
  },
  {
    title: 'Launch announcement email',
    prompt:
      'Draft a short launch email to 4,000 beta users. Thank them, list 3 features, include one clear CTA. Under 150 words. Subject line options too.',
    response:
      '**Subject options**\n- It is live — thank you\n- PromptShelf 1.0 is here\n\nHi {{first_name}},\n\nThanks to you, PromptShelf is out of beta today. Three things you helped shape:\n\n- Command palette (⌘K) for everything\n- One-click export to Markdown\n- Import any chat and split it automatically\n\n[Open your library →]',
    source: 'chatgpt',
    categoryId: 'cat-writing',
    tagIds: ['tag-email', 'tag-copywriting'],
    collectionIds: ['col-launch'],
  },
  {
    title: 'Cold outreach that does not sound like spam',
    prompt:
      'Write a 4-sentence cold email to a head of design at a fintech. Reference something specific about their product. No flattery, no "I hope this finds you well".',
    response:
      'Saw that your onboarding now verifies IDs in under a minute — that flow is rare in banking. We help design teams keep prompt libraries for their AI features consistent across squads. Would a 15-minute walkthrough next Tuesday be useful? If not, no follow-up from me.',
    source: 'claude',
    categoryId: 'cat-writing',
    tagIds: ['tag-email'],
    collectionIds: ['col-launch'],
  },
  {
    title: 'Positioning statement workshop',
    prompt:
      'Run me through April Dunford-style positioning for a prompt management tool. Ask one question at a time and wait for my answer.',
    response:
      'Great. Question 1 of 5: **If your product did not exist, what would your best customers use instead?** Be specific — name tools, spreadsheets or habits.',
    source: 'chatgpt',
    categoryId: 'cat-product',
    tagIds: ['tag-strategy'],
    collectionIds: ['col-launch'],
  },
  {
    title: 'PRD skeleton for a new feature',
    prompt:
      'Create a one-page PRD template for a small feature. Sections: problem, users, non-goals, success metrics, open questions. Keep it terse.',
    response:
      '# Feature name\n**Problem** — one paragraph.\n**Users** — who, how often.\n**Non-goals** — bullet list.\n**Success metrics** — leading + lagging.\n**Open questions** — owner + due date for each.',
    source: 'gemini',
    categoryId: 'cat-product',
    tagIds: ['tag-strategy'],
    collectionIds: [],
    favorite: true,
  },
  {
    title: 'Prioritize a messy backlog',
    prompt:
      'Here are 18 backlog items with rough effort. Score them with RICE, then group into Now / Next / Later. Flag anything that looks like two items in one.',
    response:
      '**Now:** bulk export, keyboard shortcuts, import fixes.\n**Next:** shared collections, tag colors.\n**Later:** browser extension, team billing.\n\n"Search + filters revamp" is really two items — split it.',
    source: 'claude',
    categoryId: 'cat-product',
    tagIds: ['tag-strategy'],
    collectionIds: [],
  },
  {
    title: 'Summarize a research paper for a PM',
    prompt:
      'Summarize this paper for a product manager with no ML background. 5 bullets max, then "What this means for us" in two sentences.',
    response:
      '- Retrieval beats fine-tuning for fast-changing facts.\n- Chunk size matters more than embedding model choice.\n- Re-ranking adds ~8% accuracy for little cost.\n- Long context alone does not replace retrieval.\n- Evaluation sets must be refreshed monthly.\n\n**What this means for us:** start with RAG and a re-ranker. Budget time for evals, not model shopping.',
    source: 'claude',
    categoryId: 'cat-research',
    tagIds: ['tag-research'],
    collectionIds: ['col-study'],
  },
  {
    title: 'Competitive landscape table',
    prompt:
      'Build a comparison table of 5 prompt-management tools: pricing model, offline support, export formats, team features. Mark unknowns as "?" rather than guessing.',
    response:
      '| Tool | Pricing | Offline | Export | Teams |\n|---|---|---|---|---|\n| A | Freemium | ? | JSON | Yes |\n| B | Paid | No | CSV | Yes |\n| C | Free | Yes | MD | No |',
    source: 'chatgpt',
    categoryId: 'cat-research',
    tagIds: ['tag-research', 'tag-strategy'],
    collectionIds: [],
  },
  {
    title: 'User interview synthesis',
    prompt:
      'Here are notes from 7 user interviews. Cluster recurring pains into themes, quote one line per theme, and estimate how many users mentioned each.',
    response:
      '1. **Prompts scattered everywhere** (6/7) — "Half are in Notion, half in my chat history."\n2. **Hard to share with team** (4/7) — "I paste them in Slack and they vanish."\n3. **No idea which version worked** (3/7) — "I tweak and forget."',
    source: 'claude',
    categoryId: 'cat-research',
    tagIds: ['tag-research'],
    collectionIds: [],
    favorite: true,
  },
  {
    title: 'Explain Big-O like I am new to it',
    prompt: 'Explain Big-O notation to a junior developer using everyday analogies. End with 3 quick quiz questions.',
    response:
      'Think of looking for a name in a phone book. Reading every page is **O(n)**. Opening in the middle and halving each time is **O(log n)**.\n\n**Quiz**\n1. Nested loop over the same array?\n2. Hash map lookup?\n3. Sorting with merge sort?',
    source: 'gemini',
    categoryId: 'cat-learning',
    tagIds: ['tag-python'],
    collectionIds: ['col-study'],
  },
  {
    title: 'SQL window functions cheat sheet',
    prompt: 'Give me a compact cheat sheet of SQL window functions with one realistic example each (sales data).',
    response:
      '- `ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC)` — top seller per region.\n- `LAG(amount) OVER (ORDER BY month)` — month-over-month delta.\n- `SUM(amount) OVER (ORDER BY day ROWS 6 PRECEDING)` — 7-day rolling total.',
    source: 'chatgpt',
    categoryId: 'cat-learning',
    tagIds: ['tag-sql'],
    collectionIds: ['col-study', 'col-eng'],
    favorite: true,
  },
  {
    title: 'Learn Kazakh: daily phrases',
    prompt: 'Teach me 10 everyday Kazakh phrases for a café, with transliteration and a short usage note.',
    response:
      '1. **Сәлеметсіз бе** (sälemetsiz be) — formal hello.\n2. **Бір кофе, өтінемін** (bir kofe, ötinemin) — one coffee, please.\n3. **Рақмет** (raqmet) — thank you.\n4. **Қанша тұрады?** (qanşa turady?) — how much is it?',
    source: 'gemini',
    categoryId: 'cat-learning',
    tagIds: ['tag-research'],
    collectionIds: ['col-study'],
  },
  {
    title: 'Regex for Kazakh phone numbers',
    prompt:
      'Write a regex that validates Kazakhstan mobile numbers in formats +7 7XX XXX XX XX, 87XXXXXXXXX and 7XXXXXXXXXX. Explain each group.',
    response:
      '```\n^(?:\\+7|8|7)\\s?7\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$\n```\n- `(?:\\+7|8|7)` — country prefix variants\n- `7\\d{2}` — mobile operator code\n- remaining groups — subscriber number with optional spaces',
    source: 'other',
    categoryId: 'cat-coding',
    tagIds: ['tag-refactor'],
    collectionIds: [],
  },
  {
    title: 'Release notes from a git log',
    prompt:
      'Turn this raw git log into user-facing release notes. Group into New, Improved, Fixed. Drop internal chores. Plain language.',
    response:
      '### New\n- Export any collection as a ZIP of Markdown files.\n\n### Improved\n- Search is now instant on libraries with 10k+ items.\n\n### Fixed\n- Tags with Cyrillic letters no longer sort incorrectly.',
    source: 'claude',
    categoryId: 'cat-writing',
    tagIds: ['tag-copywriting', 'tag-refactor'],
    collectionIds: ['col-launch'],
  },
  {
    title: 'Socratic tutor for statistics',
    prompt:
      'Be a Socratic tutor. I want to understand p-values. Never give the answer directly — ask guiding questions and correct misconceptions gently.',
    response:
      'Let us start simple. Imagine you flip a coin 10 times and get 9 heads. **Before any formulas — what is your gut feeling about the coin, and why?**',
    source: 'chatgpt',
    categoryId: 'cat-learning',
    tagIds: ['tag-research'],
    collectionIds: ['col-study'],
  },
  {
    title: 'Debug a flaky React test',
    prompt:
      'This React Testing Library test passes locally but fails in CI about 1 in 5 runs. Here is the test and the component. What is likely wrong?',
    response:
      'The assertion runs before the async state update settles. Replace `getByText` with `await findByText`, and wrap timer-based code with `vi.useFakeTimers()` + `await vi.runAllTimersAsync()`. Also check that MSW handlers are reset between tests.',
    source: 'claude',
    categoryId: 'cat-coding',
    tagIds: ['tag-react'],
    collectionIds: ['col-eng'],
  },
  {
    title: 'Meeting notes → action items',
    prompt:
      'Extract decisions and action items from these meeting notes. Format: owner — action — due date. Mark unclear owners as "TBD".',
    response:
      '**Decisions**\n- Ship import v2 behind a flag.\n\n**Actions**\n- Aigerim — write migration plan — Oct 3\n- TBD — update pricing page copy — Oct 7\n- Daniyar — load test export endpoint — Oct 5',
    source: 'gemini',
    categoryId: 'cat-product',
    tagIds: ['tag-email'],
    collectionIds: [],
  },
  {
    title: 'Tone rewrite: friendly but firm',
    prompt:
      'Rewrite this message to a client who keeps missing payment deadlines. Friendly, firm, no passive aggression. Keep it under 80 words.',
    response:
      'Hi Marat, a quick note on invoice #1042, which was due last Friday. Could you confirm a payment date this week? From next month we will need payment before work begins on new requests. Happy to talk it through if anything is blocking on your side.',
    source: 'chatgpt',
    categoryId: 'cat-writing',
    tagIds: ['tag-email'],
    collectionIds: [],
  },
  {
    title: 'Design tokens naming',
    prompt:
      'Propose a naming scheme for design tokens (color, spacing, radius) that scales to dark mode and multiple brands. Show 10 examples.',
    response:
      'Use `{category}.{role}.{variant}.{state}`:\n- `color.bg.surface`\n- `color.bg.surface.hover`\n- `color.fg.muted`\n- `color.border.subtle`\n- `color.accent.default`\n- `space.2` (8px)\n- `radius.md` (12px)',
    source: 'claude',
    categoryId: 'cat-product',
    tagIds: ['tag-react', 'tag-strategy'],
    collectionIds: [],
  },
]

export const seedItems: SeedItem[] = raw.map((r, i) => ({
  id: `item-${String(i + 1).padStart(2, '0')}`,
  notes: '',
  favorite: false,
  ...r,
  createdAt: d(1 + i, 9),
  updatedAt: d(2 + i, 11 + (i % 6)),
}))
