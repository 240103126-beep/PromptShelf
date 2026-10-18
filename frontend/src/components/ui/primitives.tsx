import type { ReactNode } from 'react'
import { cn, COLOR_DOT } from '@/lib/utils'
import type { ColorKey } from '@/types'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-[8px] bg-subtle', className)} />
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-surface px-1 font-sans text-[11px] font-medium text-faint',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Dot({ color, className }: { color: ColorKey; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', COLOR_DOT[color], className)} />
}

export function Chip({
  children,
  color,
  active,
  onClick,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode
  color?: ColorKey
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  removeLabel?: string
  className?: string
}) {
  const cls = cn(
    'inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors duration-150',
    active
      ? 'border-accent bg-accent-soft text-accent-text'
      : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg',
    className,
  )
  const content = (
    <>
      {color && <Dot color={color} />}
      <span className="truncate">{children}</span>
    </>
  )
  if (onRemove) {
    return (
      <span className={cls}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-1 ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-faint hover:bg-subtle hover:text-fg"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
        {content}
      </button>
    )
  }
  return <span className={cls}>{content}</span>
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-[12px] border border-border bg-surface', className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-balance text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-pretty text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; ariaLabel?: string }[]
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] border border-border bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.ariaLabel}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-xs font-medium transition-colors duration-150 [&_svg]:size-4',
            size === 'sm' ? 'h-7' : 'h-8',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150',
        checked ? 'bg-accent' : 'bg-border-strong',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
