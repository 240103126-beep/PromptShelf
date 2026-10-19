import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Textarea } from '@/components/ui/Field'
import { Card, PageHeader } from '@/components/ui/primitives'
import { currentLocale } from '@/lib/locale'
import { cn } from '@/lib/utils'
import { useApi } from '@/providers/ApiProvider'
import type { ChatMessage } from '@/types'

export default function AssistantPage() {
  const { t, i18n } = useTranslation()
  const api = useApi()
  const locale = currentLocale(i18n.language)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [improved, setImproved] = useState('')
  const [improving, setImproving] = useState(false)
  const [copied, setCopied] = useState(false)

  async function ask() {
    const q = question.trim()
    if (!q || asking) return
    const history = messages
    setMessages([...messages, { role: 'user', content: q }])
    setQuestion('')
    setProblem(null)
    setAsking(true)
    try {
      const res = await api.ai.askLibrary({ question: q, history, locale })
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, citations: res.citations }])
    } catch {
      setProblem(t('editor.ai.failed'))
    } finally {
      setAsking(false)
    }
  }

  async function improve() {
    if (!draft.trim()) return
    setImproving(true)
    setProblem(null)
    setCopied(false)
    try {
      setImproved(await api.ai.improvePrompt({ prompt: draft, locale }))
    } catch {
      setProblem(t('editor.ai.failed'))
    } finally {
      setImproving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('assistant.title')} description={t('assistant.description')} />
      {problem && (
        <p role="alert" className="mb-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {problem}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold tracking-tight">{t('assistant.askTitle')}</h2>
          <Card className="flex min-h-[420px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && <EmptyState art="chat" title={t('assistant.emptyTitle')} body={t('assistant.emptyBody')} className="py-8" />}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-[12px] px-3.5 py-2.5 text-sm',
                      m.role === 'user' ? 'bg-accent text-accent-fg' : 'bg-subtle text-fg',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 border-t border-border pt-2 text-xs">
                        <span className="text-faint">{t('assistant.sources')}: </span>
                        {m.citations.map((c) => (
                          <Link key={c.itemId} to={`/app/items/${c.itemId}`} className="mr-2 text-accent-text underline">
                            {c.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {asking && <p className="text-sm text-faint">{t('assistant.thinking')}</p>}
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <Input
                value={question}
                placeholder={t('assistant.askPlaceholder')}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ask()
                  }
                }}
              />
              <Button variant="primary" onClick={ask} loading={asking} aria-label={t('assistant.send')}>
                <Send aria-hidden />
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold tracking-tight">{t('assistant.improveTitle')}</h2>
          <Card className="space-y-3 p-4">
            <Textarea mono rows={6} value={draft} placeholder={t('assistant.improvePlaceholder')} onChange={(e) => setDraft(e.target.value)} />
            <Button variant="primary" loading={improving} onClick={improve}>
              <Sparkles aria-hidden />
              {t('assistant.improve')}
            </Button>
            {improved && (
              <div className="rounded-[10px] bg-subtle p-3">
                <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-faint">{t('assistant.result')}</div>
                <p className="whitespace-pre-wrap font-mono text-[12.5px]">{improved}</p>
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-accent-text underline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(improved)
                    setCopied(true)
                  }}
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
