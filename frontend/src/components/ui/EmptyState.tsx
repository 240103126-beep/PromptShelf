import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Art = 'shelf' | 'search' | 'folder' | 'tag' | 'chat' | 'import' | 'lost'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Illustration({ art }: { art: Art }) {
  switch (art) {
    case 'shelf':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <path d="M10 66h100" />
          <path d="M14 66v6M106 66v6" />
          <rect x="22" y="22" width="12" height="44" rx="2" />
          <rect x="36" y="30" width="10" height="36" rx="2" />
          <path d="M52 28l10-3 11 41-10 3z" />
          <rect x="78" y="36" width="14" height="30" rx="2" />
          <path d="M26 30h4M26 36h4M81 44h8" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <circle cx="54" cy="36" r="18" />
          <path d="M67 49l16 16" />
          <path d="M46 36h16" strokeDasharray="2 4" />
          <path d="M20 70h80" opacity=".5" />
        </svg>
      )
    case 'folder':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <path d="M24 24h22l6 6h44a4 4 0 014 4v30a4 4 0 01-4 4H24a4 4 0 01-4-4V28a4 4 0 014-4z" />
          <path d="M20 38h80" />
          <path d="M50 52h20" />
        </svg>
      )
    case 'tag':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <path d="M30 20h28l32 32-22 22-38-38z" />
          <circle cx="42" cy="32" r="4" />
          <path d="M68 46l-8 8M76 54l-8 8" opacity=".5" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <path d="M18 18h50a6 6 0 016 6v20a6 6 0 01-6 6H36l-10 8v-8h-8a6 6 0 01-6-6V24a6 6 0 016-6z" />
          <path d="M54 40h42a6 6 0 016 6v14a6 6 0 01-6 6h-4v8l-10-8H54a6 6 0 01-6-6" />
          <path d="M26 30h30M26 38h18" />
        </svg>
      )
    case 'import':
      return (
        <svg viewBox="0 0 120 80" className="h-20 w-30" aria-hidden {...stroke}>
          <rect x="22" y="14" width="40" height="52" rx="4" />
          <path d="M30 26h24M30 34h24M30 42h14" />
          <path d="M70 40h24M86 32l8 8-8 8" />
          <rect x="98" y="26" width="10" height="28" rx="2" opacity=".5" />
        </svg>
      )
    case 'lost':
      return (
        <svg viewBox="0 0 160 90" className="h-24 w-40" aria-hidden {...stroke}>
          <path d="M10 76h140" />
          <rect x="24" y="30" width="12" height="46" rx="2" />
          <rect x="38" y="38" width="10" height="38" rx="2" />
          <path d="M60 76l-6-30 10-2" opacity=".6" />
          <path d="M100 76V40" strokeDasharray="3 5" />
          <rect x="112" y="34" width="14" height="42" rx="2" />
          <path d="M76 22c0-6 5-10 11-10s11 4 11 10c0 7-11 7-11 15M87 46v.5" />
        </svg>
      )
  }
}

export function EmptyState({
  art,
  title,
  body,
  action,
  className,
}: {
  art: Art
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <div className="mb-6 text-border-strong">
        <Illustration art={art} />
      </div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {body && <p className="mt-1.5 max-w-sm text-pretty text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export { Illustration }
