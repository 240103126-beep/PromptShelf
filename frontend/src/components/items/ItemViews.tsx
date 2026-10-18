import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Checkbox } from '@/components/ui/Field'
import { Chip, Skeleton } from '@/components/ui/primitives'
import { cn, excerpt, formatRelative } from '@/lib/utils'
import type { Category, Item, Tag } from '@/types'

export function SourceLabel({ source, className }: { source: Item['source']; className?: string }) {
  const { t } = useTranslation()
  return <span className={cn('font-mono text-[11px] uppercase tracking-wide text-faint', className)}>{t(`sources.${source}`)}</span>
}

export function FavoriteButton({
  active,
  onToggle,
  title,
  size = 'sm',
}: {
  active: boolean
  onToggle: () => void
  title: string
  size?: 'sm' | 'md'
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={active ? t('items.unfavorite', { title }) : t('items.favorite', { title })}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-subtle',
        size === 'sm' ? 'size-7' : 'size-9',
        active ? 'text-amber-500' : 'text-faint hover:text-fg',
      )}
    >
      <Star className={cn('size-4', active && 'fill-current')} aria-hidden />
    </button>
  )
}

interface ViewProps {
  item: Item
  tags: Map<string, Tag>
  categories: Map<string, Category>
  selected: boolean
  onSelect: (checked: boolean) => void
  onToggleFavorite: () => void
}

function TagChips({ item, tags, max = 3 }: { item: Item; tags: Map<string, Tag>; max?: number }) {
  const list = item.tagIds.map((id) => tags.get(id)).filter(Boolean) as Tag[]
  if (!list.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.slice(0, max).map((tag) => (
        <Chip key={tag.id} color={tag.color}>
          {tag.name}
        </Chip>
      ))}
      {list.length > max && <Chip>+{list.length - max}</Chip>}
    </div>
  )
}

const coverLink =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"

export function ItemRow({ item, tags, categories, selected, onSelect, onToggleFavorite }: ViewProps) {
  const { t, i18n } = useTranslation()
  const title = item.title || t('common.untitled')
  const category = item.categoryId ? categories.get(item.categoryId) : undefined
  return (
    <li
      className={cn(
        'relative flex items-start gap-3 border-b border-border px-3 py-4 transition-colors duration-150 last:border-b-0 hover:bg-subtle/60 sm:px-4',
        selected && 'bg-accent-soft/50 hover:bg-accent-soft/60',
      )}
    >
      <div className="relative z-10 flex h-6 items-center">
        <Checkbox checked={selected} onChange={onSelect} label={t('library.selectItem', { title })} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <Link to={`/app/items/${item.id}`} className={cn('truncate font-medium text-fg', coverLink, 'focus-visible:after:rounded-[8px]')}>
            {title}
          </Link>
          <SourceLabel source={item.source} className="hidden shrink-0 sm:inline" />
        </div>
        <p className="mt-1 line-clamp-1 font-mono text-[12.5px] text-muted">{excerpt(item.prompt || item.response, 180)}</p>
        {(category || item.tagIds.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {category && <span className="text-xs text-muted">{category.name}</span>}
            <TagChips item={item} tags={tags} />
          </div>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end gap-1">
        <FavoriteButton active={item.favorite} onToggle={onToggleFavorite} title={title} />
        <time dateTime={item.updatedAt} className="whitespace-nowrap text-xs text-faint">
          {formatRelative(item.updatedAt, i18n.language)}
        </time>
      </div>
    </li>
  )
}

export function ItemCard({ item, tags, categories, selected, onSelect, onToggleFavorite }: ViewProps) {
  const { t, i18n } = useTranslation()
  const title = item.title || t('common.untitled')
  const category = item.categoryId ? categories.get(item.categoryId) : undefined
  return (
    <li
      className={cn(
        'relative flex flex-col rounded-[12px] border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong',
        selected && 'border-accent ring-1 ring-accent',
      )}
    >
      <div className="relative z-10 flex items-center justify-between">
        <Checkbox checked={selected} onChange={onSelect} label={t('library.selectItem', { title })} />
        <FavoriteButton active={item.favorite} onToggle={onToggleFavorite} title={title} />
      </div>
      <Link to={`/app/items/${item.id}`} className={cn('mt-2 line-clamp-2 font-medium text-fg', coverLink, 'focus-visible:after:rounded-[12px]')}>
        {title}
      </Link>
      <p className="mt-2 line-clamp-3 flex-1 font-mono text-[12.5px] leading-relaxed text-muted">
        {excerpt(item.prompt || item.response, 220)}
      </p>
      <div className="mt-4">
        <TagChips item={item} tags={tags} max={2} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <SourceLabel source={item.source} />
          {category && <span className="truncate text-muted">· {category.name}</span>}
        </span>
        <time dateTime={item.updatedAt} className="whitespace-nowrap text-faint">
          {formatRelative(item.updatedAt, i18n.language)}
        </time>
      </div>
    </li>
  )
}

export function ItemListSkeleton({ view, count = 6 }: { view: 'list' | 'grid'; count?: number }) {
  const { t } = useTranslation()
  const arr = Array.from({ length: count })
  if (view === 'grid') {
    return (
      <div role="status" aria-label={t('common.loading')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {arr.map((_, i) => (
          <div key={i} className="rounded-[12px] border border-border bg-surface p-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="mt-4 h-4 w-3/4" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <Skeleton className="mt-6 h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div role="status" aria-label={t('common.loading')} className="rounded-[12px] border border-border bg-surface">
      {arr.map((_, i) => (
        <div key={i} className="flex gap-3 border-b border-border px-4 py-4 last:border-b-0">
          <Skeleton className="mt-1 size-4" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2.5 h-3 w-4/5" />
            <Skeleton className="mt-3 h-5 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
