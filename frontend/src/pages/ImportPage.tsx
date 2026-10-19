import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox, Input, Textarea } from '@/components/ui/Field'
import { Card, PageHeader } from '@/components/ui/primitives'
import { ALL_SCOPES, useInvalidate } from '@/hooks/useData'
import { useApi } from '@/providers/ApiProvider'
import type { ItemInput, SplitChatItem } from '@/types'

interface Draft extends SplitChatItem {
  checked: boolean
}

export default function ImportPage() {
  const { t } = useTranslation()
  const api = useApi()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const [raw, setRaw] = useState('')
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [splitting, setSplitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function split() {
    if (!raw.trim()) {
      setError(t('import.needText'))
      return
    }
    setError(null)
    setSplitting(true)
    try {
      const items = await api.ai.splitChat({ raw })
      setDrafts(items.map((i) => ({ ...i, checked: true })))
    } catch {
      setError(t('editor.ai.failed'))
    } finally {
      setSplitting(false)
    }
  }

  async function save() {
    const chosen = (drafts ?? []).filter((d) => d.checked)
    if (chosen.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const inputs: ItemInput[] = chosen.map((d) => ({
        title: d.title.trim() || t('common.untitled'),
        prompt: d.prompt,
        response: d.response,
        source: d.source,
        categoryId: null,
        tagIds: [],
        collectionIds: [],
        notes: '',
        favorite: false,
      }))
      await api.createItems(inputs)
      await invalidate(...ALL_SCOPES)
      navigate('/app')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((list) => (list ? list.map((d, i) => (i === index ? { ...d, ...patch } : d)) : list))
  const count = (drafts ?? []).filter((d) => d.checked).length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('import.title')} description={t('import.description')} />

      <Textarea mono rows={10} value={raw} placeholder={t('import.placeholder')} onChange={(e) => setRaw(e.target.value)} />
      <div className="mt-3 flex justify-end">
        <Button variant="primary" loading={splitting} onClick={split}>
          <Sparkles aria-hidden />
          {t('import.split')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {drafts && drafts.length === 0 && <EmptyState art="import" title={t('import.noItems')} />}

      {drafts && drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold tracking-tight">{t('import.reviewTitle')}</h2>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <Card key={i} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Checkbox checked={d.checked} label={d.title} onChange={(on) => update(i, { checked: on })} />
                  <Input value={d.title} onChange={(e) => update(i, { title: e.target.value })} />
                  <span className="text-xs text-faint">{t(`sources.${d.source}`)}</span>
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[12px] text-muted">{d.prompt}</pre>
                {d.response && <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[12px] text-faint">{d.response}</pre>}
              </Card>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled={count === 0} loading={saving} onClick={save}>
              {t('import.save', { count })}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
