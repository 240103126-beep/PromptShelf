import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox } from '@/components/ui/Field'
import { Card, PageHeader, Segmented, Skeleton } from '@/components/ui/primitives'
import { useCollections } from '@/hooks/useData'
import { saveBlob } from '@/lib/saveBlob'
import { useApi } from '@/providers/ApiProvider'
import type { ExportFormat } from '@/types'

export default function ExportPage() {
  const { t } = useTranslation()
  const api = useApi()
  const { data: collections, isLoading } = useCollections()
  const [selected, setSelected] = useState<string[]>([])
  const [format, setFormat] = useState<ExportFormat>('md')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const all = collections ?? []
  const allSelected = all.length > 0 && selected.length === all.length

  async function run() {
    if (selected.length === 0) {
      setError(t('export.needSelection'))
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api.exportCollections({ collectionIds: selected, format })
      saveBlob(res.blob, res.filename)
      setMessage(t('export.done', { count: res.itemCount, name: res.filename }))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('export.title')} description={t('export.description')} />

      {isLoading && <Skeleton className="h-40" />}

      {!isLoading && all.length === 0 && (
        <EmptyState
          art="folder"
          title={t('export.emptyTitle')}
          body={t('export.emptyBody')}
          action={
            <Link to="/app/collections" className="text-sm font-medium text-accent-text underline">
              {t('export.goCollections')}
            </Link>
          }
        />
      )}

      {all.length > 0 && (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">{t('export.selectCollections')}</h2>
              <button
                type="button"
                className="text-xs font-medium text-accent-text underline"
                onClick={() => setSelected(allSelected ? [] : all.map((c) => c.id))}
              >
                {t('export.selectAll')}
              </button>
            </div>
            <Card className="divide-y divide-border">
              {all.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-subtle">
                  <Checkbox
                    checked={selected.includes(c.id)}
                    label={c.name}
                    onChange={(on) => setSelected((s) => (on ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-faint">{t('collections.itemsCount', { count: c.itemCount })}</span>
                </label>
              ))}
            </Card>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold tracking-tight">{t('export.format')}</h2>
            <Segmented
              label={t('export.format')}
              value={format}
              onChange={setFormat}
              options={[
                { value: 'md', label: t('export.formatMd') },
                { value: 'zip', label: t('export.formatZip') },
              ]}
            />
          </section>

          {error && (
            <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {message && <p className="rounded-[10px] bg-accent-soft px-3 py-2 text-sm text-accent-text">{message}</p>}

          <Button variant="primary" size="lg" loading={busy} onClick={run}>
            <FileDown aria-hidden />
            {t('export.export')}
          </Button>
        </div>
      )}
    </div>
  )
}
