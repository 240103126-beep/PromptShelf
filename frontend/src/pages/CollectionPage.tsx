import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileDown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox, Input, Label, Textarea } from '@/components/ui/Field'
import { Card, PageHeader, Skeleton } from '@/components/ui/primitives'
import { ALL_SCOPES, useCollection, useInvalidate, useItems } from '@/hooks/useData'
import { saveBlob } from '@/lib/saveBlob'
import { useApi } from '@/providers/ApiProvider'
import type { ExportFormat } from '@/types'

export default function CollectionPage() {
  const { id } = useParams()
  const colId = id ?? ''
  const { t } = useTranslation()
  const api = useApi()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: collection, isLoading, error: loadError } = useCollection(id)
  const { data: itemsData } = useItems({ collectionId: colId, sort: 'updated' })
  const { data: allData } = useItems({ sort: 'title' })
  const items = itemsData ?? []
  const available = (allData ?? []).filter((i) => !i.collectionIds.includes(colId))

  const [addOpen, setAddOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setProblem(null)
    setMessage(null)
    try {
      await fn()
      await invalidate(...ALL_SCOPES)
    } catch (e) {
      setProblem(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const doExport = (format: ExportFormat) =>
    run(async () => {
      const res = await api.exportCollections({ collectionIds: [colId], format })
      saveBlob(res.blob, res.filename)
      setMessage(t('collection.exported', { count: res.itemCount }))
    })

  if (isLoading) return <Skeleton className="mx-auto h-64 max-w-4xl" />
  if (loadError || !collection)
    return (
      <EmptyState
        art="lost"
        title={t('collection.notFound')}
        action={
          <Link to="/app/collections" className="text-sm font-medium text-accent-text underline">
            {t('collection.back')}
          </Link>
        }
      />
    )

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/app/collections" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {t('collection.back')}
      </Link>
      <PageHeader
        title={collection.name}
        description={collection.description || t('collections.itemsCount', { count: collection.itemCount })}
        actions={
          <>
            <Button
              onClick={() => {
                setName(collection.name)
                setDescription(collection.description)
                setEditOpen(true)
              }}
            >
              <Pencil aria-hidden />
              {t('common.edit')}
            </Button>
            <Button onClick={() => doExport('md')} loading={busy}>
              <FileDown aria-hidden />
              {t('collection.exportMd')}
            </Button>
            <Button onClick={() => doExport('zip')} loading={busy}>
              <FileDown aria-hidden />
              {t('collection.exportZip')}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
              {t('common.delete')}
            </Button>
          </>
        }
      />

      {message && <p className="mb-4 rounded-[10px] bg-accent-soft px-3 py-2 text-sm text-accent-text">{message}</p>}
      {problem && (
        <p role="alert" className="mb-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {problem}
        </p>
      )}

      <div className="mb-4 flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            setPicked([])
            setAddOpen(true)
          }}
        >
          <Plus aria-hidden />
          {t('collection.addItems')}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState art="shelf" title={t('collection.emptyTitle')} body={t('collection.emptyBody')} />
      ) : (
        <Card className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <Link to={`/app/items/${item.id}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.title}</div>
                <div className="truncate text-sm text-muted">{item.prompt || item.response}</div>
              </Link>
              <span className="hidden text-xs text-faint sm:block">{t(`sources.${item.source}`)}</span>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label={t('collection.remove')}
                onClick={() => run(async () => void (await api.bulkUpdateItems([item.id], { removeCollectionIds: [colId] })))}
              >
                <X aria-hidden />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('collection.addTitle')}
        className="max-w-lg"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              disabled={picked.length === 0}
              loading={busy}
              onClick={async () => {
                await run(async () => void (await api.bulkUpdateItems(picked, { addCollectionIds: [colId] })))
                setAddOpen(false)
              }}
            >
              {t('collection.addConfirm', { count: picked.length })}
            </Button>
          </>
        }
      >
        {available.length === 0 ? (
          <p className="text-muted">{t('collection.addNone')}</p>
        ) : (
          <ul className="-mx-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {available.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-[8px] px-2 py-1.5 hover:bg-subtle">
                <Checkbox
                  checked={picked.includes(item.id)}
                  label={item.title}
                  onChange={(on) => setPicked((p) => (on ? [...p, item.id] : p.filter((x) => x !== item.id)))}
                />
                <span className="truncate text-sm">{item.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('collection.editTitle')}
        footer={
          <>
            <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!name.trim()}
              onClick={async () => {
                await run(async () => void (await api.updateCollection(colId, { name: name.trim(), description })))
                setEditOpen(false)
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="ec-name">{t('common.name')}</Label>
            <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ec-desc">{t('common.description')}</Label>
            <Textarea id="ec-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await run(() => api.deleteCollection(colId))
          navigate('/app/collections')
        }}
        title={t('collection.deleteTitle')}
        description={t('collection.deleteBody')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}
