import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { FolderPlus, LayoutGrid, List, Plus, Search, Star, Tag as TagIcon, Trash2, X } from 'lucide-react'
import { ItemCard, ItemListSkeleton, ItemRow } from '@/components/items/ItemViews'
import { Button, buttonVariants } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox, Input, Select } from '@/components/ui/Field'
import { Chip, Kbd, PageHeader, Segmented } from '@/components/ui/primitives'
import { useCategories, useCollections, useInvalidate, useItems, useTags } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { useApi } from '@/providers/ApiProvider'
import { SEARCH_INPUT_ID } from '@/providers/CommandProvider'
import { usePreferences } from '@/providers/PreferencesProvider'
import { useToast } from '@/providers/ToastProvider'
import { SOURCES, type ItemQuery, type SortKey, type Source } from '@/types'

const SORTS: SortKey[] = ['updated', 'newest', 'oldest', 'title']

export default function LibraryPage() {
  const { t } = useTranslation()
  const api = useApi()
  const notify = useToast()
  const invalidate = useInvalidate()
  const navigate = useNavigate()
  const location = useLocation()
  const { prefs, setPref } = usePreferences()
  const [params, setParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)

  const q = params.get('q') ?? ''
  const deferredQ = useDeferredValue(q)
  const query: ItemQuery = {
    search: deferredQ.trim() || undefined,
    tagId: params.get('tag') ?? undefined,
    categoryId: params.get('category') ?? undefined,
    collectionId: params.get('collection') ?? undefined,
    source: (params.get('source') as Source | null) ?? undefined,
    favorite: params.get('fav') === '1' || undefined,
    sort: (params.get('sort') as SortKey | null) ?? prefs.sort,
  }
  const hasFilters = Boolean(query.search || query.tagId || query.categoryId || query.collectionId || query.source || query.favorite)

  const { data: items, isLoading } = useItems(query)
  const { data: tags } = useTags()
  const { data: categories } = useCategories()
  const { data: collections } = useCollections()
  const tagMap = useMemo(() => new Map((tags ?? []).map((x) => [x.id, x])), [tags])
  const catMap = useMemo(() => new Map((categories ?? []).map((x) => [x.id, x])), [categories])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if ((location.state as { focusSearch?: boolean } | null)?.focusSearch) {
      searchRef.current?.focus()
      navigate('.', { replace: true, state: null })
    }
  }, [location.state, navigate])

  useEffect(() => {
    if (!items) return
    setSelected((prev) => {
      const visible = new Set(items.map((i) => i.id))
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const setParam = (key: string, value: string | null) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const allSelected = Boolean(items?.length) && selected.size === items!.length
  const ids = [...selected]

  const runBulk = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await fn()
      await invalidate('items', 'item', 'tags', 'categories', 'collections', 'collection')
      notify(message)
    } catch {
      notify(t('common.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await api.updateItem(id, { favorite })
      await invalidate('items', 'item')
    } catch {
      notify(t('common.error'), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('library.title')}
        description={items ? t('library.count', { count: items.length }) : t('library.description')}
        actions={
          <>
            <Segmented
              label={t('library.view')}
              value={prefs.view}
              onChange={(v) => setPref('view', v)}
              options={[
                { value: 'list', label: <List aria-hidden />, ariaLabel: t('library.viewList') },
                { value: 'grid', label: <LayoutGrid aria-hidden />, ariaLabel: t('library.viewGrid') },
              ]}
            />
            <Link to="/app/new" className={cn(buttonVariants({ variant: 'primary' }), 'hidden sm:inline-flex')}>
              <Plus aria-hidden />
              {t('nav.newItem')}
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
            {t('library.searchLabel')}
          </label>
          <Input
            ref={searchRef}
            id={SEARCH_INPUT_ID}
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value || null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setParam('q', null)
                e.currentTarget.blur()
              }
            }}
            placeholder={t('library.searchPlaceholder')}
            className="h-10 pl-9 pr-12"
          />
          <Kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">/</Kbd>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('library.filters')}>
          <Select
            aria-label={t('library.filterCategory')}
            value={query.categoryId ?? ''}
            onChange={(e) => setParam('category', e.target.value || null)}
            className="w-[calc(50%-4px)] sm:w-44"
          >
            <option value="">{t('library.allCategories')}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('library.filterCollection')}
            value={query.collectionId ?? ''}
            onChange={(e) => setParam('collection', e.target.value || null)}
            className="w-[calc(50%-4px)] sm:w-44"
          >
            <option value="">{t('library.allCollections')}</option>
            {collections?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('library.filterSource')}
            value={query.source ?? ''}
            onChange={(e) => setParam('source', e.target.value || null)}
            className="w-[calc(50%-4px)] sm:w-36"
          >
            <option value="">{t('library.allSources')}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`sources.${s}`)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('library.sort')}
            value={query.sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="w-[calc(50%-4px)] sm:w-40"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`library.sortBy.${s}`)}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="md"
            aria-pressed={Boolean(query.favorite)}
            onClick={() => setParam('fav', query.favorite ? null : '1')}
            className={cn(query.favorite && 'border-accent bg-accent-soft text-accent-text hover:bg-accent-soft')}
          >
            <Star className={cn(query.favorite && 'fill-current')} aria-hidden />
            {t('library.favorites')}
          </Button>
          {hasFilters && (
            <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>
              <X aria-hidden />
              {t('library.clearFilters')}
            </Button>
          )}
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('library.filterTag')}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                color={tag.color}
                active={query.tagId === tag.id}
                onClick={() => setParam('tag', query.tagId === tag.id ? null : tag.id)}
              >
                {tag.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {items && items.length > 0 && (
          <div
            className={cn(
              'mb-3 flex min-h-10 flex-wrap items-center gap-2 rounded-[10px] px-3 py-1.5 transition-colors duration-150',
              selected.size > 0 && 'sticky top-16 z-20 border border-border bg-surface shadow-pop md:top-4',
            )}
          >
            <Checkbox
              checked={allSelected}
              indeterminate={selected.size > 0 && !allSelected}
              onChange={(on) => setSelected(on ? new Set(items.map((i) => i.id)) : new Set())}
              label={t('library.selectAll')}
            />
            <span className="text-sm text-muted" aria-live="polite">
              {selected.size > 0 ? t('library.selected', { count: selected.size }) : t('library.selectAll')}
            </span>
            {selected.size > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => runBulk(() => api.bulkUpdateItems(ids, { favorite: true }), t('library.bulkFavorited', { count: ids.length }))}
                >
                  <Star aria-hidden />
                  <span className="hidden sm:inline">{t('library.bulkFavorite')}</span>
                </Button>
                <label className="sr-only" htmlFor="bulk-collection">
                  {t('library.bulkAddToCollection')}
                </label>
                <div className="relative">
                  <FolderPlus className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" aria-hidden />
                  <Select
                    id="bulk-collection"
                    value=""
                    disabled={busy}
                    onChange={(e) => {
                      const id = e.target.value
                      const col = collections?.find((c) => c.id === id)
                      if (id)
                        runBulk(
                          () => api.bulkUpdateItems(ids, { addCollectionIds: [id] }),
                          t('library.bulkAdded', { count: ids.length, name: col?.name ?? '' }),
                        )
                    }}
                    className="[&_select]:h-8 [&_select]:w-40 [&_select]:pl-8"
                  >
                    <option value="">{t('library.bulkAddToCollection')}</option>
                    {collections?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="sr-only" htmlFor="bulk-tag">
                  {t('library.bulkAddTag')}
                </label>
                <div className="relative">
                  <TagIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted" aria-hidden />
                  <Select
                    id="bulk-tag"
                    value=""
                    disabled={busy}
                    onChange={(e) => {
                      const id = e.target.value
                      const tag = tags?.find((x) => x.id === id)
                      if (id)
                        runBulk(
                          () => api.bulkUpdateItems(ids, { addTagIds: [id] }),
                          t('library.bulkTagged', { count: ids.length, name: tag?.name ?? '' }),
                        )
                    }}
                    className="[&_select]:h-8 [&_select]:w-36 [&_select]:pl-8"
                  >
                    <option value="">{t('library.bulkAddTag')}</option>
                    {tags?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden />
                  <span className="hidden sm:inline">{t('common.delete')}</span>
                </Button>
                <Button size="iconSm" variant="ghost" onClick={() => setSelected(new Set())} aria-label={t('library.clearSelection')}>
                  <X aria-hidden />
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading && !items ? (
          <ItemListSkeleton view={prefs.view} />
        ) : !items?.length ? (
          <div className="rounded-[12px] border border-dashed border-border">
            {hasFilters ? (
              <EmptyState
                art="search"
                title={t('library.emptyFilteredTitle')}
                body={t('library.emptyFilteredBody')}
                action={
                  <Button onClick={() => setParams({}, { replace: true })}>{t('library.clearFilters')}</Button>
                }
              />
            ) : (
              <EmptyState
                art="shelf"
                title={t('library.emptyTitle')}
                body={t('library.emptyBody')}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link to="/app/new" className={buttonVariants({ variant: 'primary' })}>
                      <Plus aria-hidden />
                      {t('nav.newItem')}
                    </Link>
                    <Link to="/app/import" className={buttonVariants()}>
                      {t('nav.import')}
                    </Link>
                  </div>
                }
              />
            )}
          </div>
        ) : prefs.view === 'grid' ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('library.title')}>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                tags={tagMap}
                categories={catMap}
                selected={selected.has(item.id)}
                onSelect={(on) => toggle(item.id, on)}
                onToggleFavorite={() => toggleFavorite(item.id, !item.favorite)}
              />
            ))}
          </ul>
        ) : (
          <ul className="rounded-[12px] border border-border bg-surface" aria-label={t('library.title')}>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                tags={tagMap}
                categories={catMap}
                selected={selected.has(item.id)}
                onSelect={(on) => toggle(item.id, on)}
                onToggleFavorite={() => toggleFavorite(item.id, !item.favorite)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('library.deleteTitle', { count: selected.size })}
        description={t('library.deleteBody')}
        confirmLabel={t('common.delete')}
        loading={busy}
        onConfirm={async () => {
          const count = ids.length
          await runBulk(() => api.deleteItems(ids), t('library.deleted', { count }))
          setSelected(new Set())
          setConfirmDelete(false)
        }}
      />
    </div>
  )
}

