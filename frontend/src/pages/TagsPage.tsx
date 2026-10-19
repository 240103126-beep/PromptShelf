import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox, Input, Select } from '@/components/ui/Field'
import { Card, Dot, PageHeader, Segmented, Skeleton } from '@/components/ui/primitives'
import { ALL_SCOPES, useCategories, useInvalidate, useTags } from '@/hooks/useData'
import { useApi } from '@/providers/ApiProvider'
import { COLOR_KEYS, type ColorKey } from '@/types'

type Kind = 'tags' | 'categories'

interface Ops {
  create(name: string, color: ColorKey): Promise<unknown>
  update(id: string, patch: { name?: string; color?: ColorKey }): Promise<unknown>
  merge(sources: string[], target: string): Promise<unknown>
  remove(id: string): Promise<void>
}

function Manager({ kind }: { kind: Kind }) {
  const { t } = useTranslation()
  const api = useApi()
  const invalidate = useInvalidate()
  const tagsQ = useTags()
  const catsQ = useCategories()
  const list = (kind === 'tags' ? tagsQ.data : catsQ.data) ?? []
  const loading = kind === 'tags' ? tagsQ.isLoading : catsQ.isLoading

  const ops: Ops =
    kind === 'tags'
      ? {
          create: (name, color) => api.createTag({ name, color }),
          update: (id, patch) => api.updateTag(id, patch),
          merge: (s, target) => api.mergeTags(s, target),
          remove: (id) => api.deleteTag(id),
        }
      : {
          create: (name, color) => api.createCategory({ name, color }),
          update: (id, patch) => api.updateCategory(id, patch),
          merge: (s, target) => api.mergeCategories(s, target),
          remove: (id) => api.deleteCategory(id),
        }

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<ColorKey>('indigo')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await invalidate(...ALL_SCOPES)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const colorOptions = COLOR_KEYS.map((c) => (
    <option key={c} value={c}>
      {t(`tags.colors.${c}`)}
    </option>
  ))
  const effectiveTarget = selected.includes(target) ? target : (selected[0] ?? '')

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newName}
          placeholder={kind === 'tags' ? t('tags.newTag') : t('tags.newCategory')}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              run(() => ops.create(newName, newColor))
              setNewName('')
            }
          }}
        />
        <Select className="sm:w-40" aria-label={t('tags.color')} value={newColor} onChange={(e) => setNewColor(e.target.value as ColorKey)}>
          {colorOptions}
        </Select>
        <Button
          variant="primary"
          disabled={!newName.trim()}
          onClick={() => {
            run(() => ops.create(newName, newColor))
            setNewName('')
          }}
        >
          {t('tags.add')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {selected.length >= 2 && (
        <Card className="mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
          <span className="text-sm text-muted">{t('tags.mergeInto')}</span>
          <Select className="sm:w-56" aria-label={t('tags.mergeInto')} value={effectiveTarget} onChange={(e) => setTarget(e.target.value)}>
            {selected.map((sid) => (
              <option key={sid} value={sid}>
                {list.find((x) => x.id === sid)?.name}
              </option>
            ))}
          </Select>
          <Button
            variant="primary"
            onClick={async () => {
              await run(() =>
                ops.merge(
                  selected.filter((x) => x !== effectiveTarget),
                  effectiveTarget,
                ),
              )
              setSelected([])
            }}
          >
            {t('tags.merge')}
          </Button>
        </Card>
      )}

      {loading && <Skeleton className="h-40" />}

      {!loading && list.length === 0 && (
        <EmptyState
          art="tag"
          title={kind === 'tags' ? t('tags.emptyTagsTitle') : t('tags.emptyCategoriesTitle')}
          body={t('tags.emptyBody')}
        />
      )}

      {list.length > 0 && (
        <>
          <p className="mb-2 text-xs text-faint">{t('tags.mergeHint')}</p>
          <Card className="divide-y divide-border">
            {list.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Checkbox
                  checked={selected.includes(entry.id)}
                  label={entry.name}
                  onChange={(on) => setSelected((s) => (on ? [...s, entry.id] : s.filter((x) => x !== entry.id)))}
                />
                <Dot color={entry.color} />
                {editingId === entry.id ? (
                  <Input className="h-8 max-w-56" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} />
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
                )}
                {editingId === entry.id && <span className="flex-1" />}
                <span className="text-xs tabular-nums text-faint">{t('tags.itemsCount', { count: entry.itemCount })}</span>
                <Select
                  className="w-32"
                  aria-label={t('tags.color')}
                  value={entry.color}
                  onChange={(e) => run(() => ops.update(entry.id, { color: e.target.value as ColorKey }))}
                >
                  {colorOptions}
                </Select>
                {editingId === entry.id ? (
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label={t('common.save')}
                    onClick={async () => {
                      await run(() => ops.update(entry.id, { name: editName }))
                      setEditingId(null)
                    }}
                  >
                    <Check aria-hidden />
                  </Button>
                ) : (
                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label={t('tags.rename')}
                    onClick={() => {
                      setEditingId(entry.id)
                      setEditName(entry.name)
                    }}
                  >
                    <Pencil aria-hidden />
                  </Button>
                )}
                <Button size="iconSm" variant="ghost" aria-label={t('common.delete')} onClick={() => setDeleting({ id: entry.id, name: entry.name })}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await run(() => ops.remove(deleting.id))
          setDeleting(null)
        }}
        title={t('tags.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('tags.deleteBody')}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}

export default function TagsPage() {
  const { t } = useTranslation()
  const [kind, setKind] = useState<Kind>('tags')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t('tags.title')}
        description={t('tags.description')}
        actions={
          <Segmented
            label={t('tags.title')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'tags', label: t('tags.tabTags') },
              { value: 'categories', label: t('tags.tabCategories') },
            ]}
          />
        }
      />
      <Manager key={kind} kind={kind} />
    </div>
  )
}
