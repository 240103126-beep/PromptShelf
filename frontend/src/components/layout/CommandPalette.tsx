import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { FileText, FolderPlus, Home, Info, Moon, Plus, Search, type LucideIcon } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd } from '@/components/ui/primitives'
import { useItems } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/providers/PreferencesProvider'
import { APP_NAV } from './nav'

interface Command {
  id: string
  label: string
  group: string
  icon: LucideIcon
  hint?: string
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toggleTheme } = usePreferences()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const { data: items } = useItems(open ? { search: query.trim() || undefined, sort: 'updated' } : {})

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to)
    const actions: Command[] = [
      { id: 'new', label: t('palette.newItem'), group: t('palette.groupActions'), icon: Plus, hint: 'N', run: go('/app/new') },
      {
        id: 'new-col',
        label: t('palette.newCollection'),
        group: t('palette.groupActions'),
        icon: FolderPlus,
        run: () => navigate('/app/collections', { state: { create: true } }),
      },
      { id: 'theme', label: t('palette.toggleTheme'), group: t('palette.groupActions'), icon: Moon, run: toggleTheme },
    ]
    const nav: Command[] = [
      ...APP_NAV.map((n) => ({ id: n.to, label: t(n.key), group: t('palette.groupNavigation'), icon: n.icon, run: go(n.to) })),
      { id: 'home', label: t('nav.home'), group: t('palette.groupNavigation'), icon: Home, run: go('/') },
      { id: 'about', label: t('nav.about'), group: t('palette.groupNavigation'), icon: Info, run: go('/about') },
    ]
    const itemCmds: Command[] = (items ?? []).slice(0, 6).map((i) => ({
      id: `item-${i.id}`,
      label: i.title || t('common.untitled'),
      group: t('palette.groupItems'),
      icon: FileText,
      run: go(`/app/items/${i.id}`),
    }))
    const q = query.trim().toLowerCase()
    const filter = (c: Command) => !q || c.label.toLowerCase().includes(q)
    return [...actions.filter(filter), ...nav.filter(filter), ...itemCmds]
  }, [t, navigate, toggleTheme, items, query])

  useEffect(() => setActive(0), [query])

  const run = (c: Command | undefined) => {
    if (!c) return
    onClose()
    c.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, commands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      run(commands[active])
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  let lastGroup = ''
  return (
    <Dialog open={open} onClose={onClose} title={t('palette.title')} hideHeader className="mt-[12vh] mb-auto max-w-xl">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-faint" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('palette.placeholder')}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={commands[active] ? `${listId}-${active}` : undefined}
          aria-label={t('palette.title')}
          className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-faint focus-visible:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul id={listId} role="listbox" aria-label={t('palette.title')} className="max-h-[50dvh] overflow-y-auto p-2">
        {commands.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">{t('palette.noResults')}</li>}
        {commands.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null
          lastGroup = c.group
          return (
            <li key={c.id} role="presentation">
              {header && (
                <div role="presentation" className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-faint">
                  {header}
                </div>
              )}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => run(c)}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-sm',
                  i === active ? 'bg-subtle text-fg' : 'text-muted',
                )}
              >
                <c.icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{c.label}</span>
                {c.hint && <Kbd className="ml-auto">{c.hint}</Kbd>}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {t('palette.hintNavigate')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {t('palette.hintSelect')}
        </span>
      </div>
    </Dialog>
  )
}
