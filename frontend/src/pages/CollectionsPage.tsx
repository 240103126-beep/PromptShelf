import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FolderClosed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { Card, PageHeader, Skeleton } from '@/components/ui/primitives'
import { useCollections, useInvalidate } from '@/hooks/useData'
import { useApi } from '@/providers/ApiProvider'

export default function CollectionsPage() {
  const { t } = useTranslation()
  const api = useApi()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: collections, isLoading } = useCollections()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!name.trim()) {
      setError(t('collections.nameRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const col = await api.createCollection({ name, description })
      await invalidate('collections', 'collection')
      setOpen(false)
      setName('')
      setDescription('')
      navigate(`/app/collections/${col.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const newButton = (
    <Button variant="primary" onClick={() => setOpen(true)}>
      <Plus aria-hidden />
      {t('collections.new')}
    </Button>
  )

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('collections.title')} description={t('collections.description')} actions={newButton} />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {collections && collections.length === 0 && (
        <EmptyState art="folder" title={t('collections.emptyTitle')} body={t('collections.emptyBody')} action={newButton} />
      )}

      {collections && collections.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} to={`/app/collections/${c.id}`} className="group">
              <Card className="h-full p-5 transition-colors duration-150 group-hover:border-border-strong">
                <FolderClosed className="mb-3 size-5 text-accent" aria-hidden />
                <h2 className="truncate font-semibold tracking-tight">{c.name}</h2>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
                <p className="mt-3 text-xs text-faint">{t('collections.itemsCount', { count: c.itemCount })}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('collections.new')}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={busy} onClick={create}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="col-name">{t('common.name')}</Label>
            <Input id="col-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="col-desc">{t('common.description')}</Label>
            <Textarea id="col-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
