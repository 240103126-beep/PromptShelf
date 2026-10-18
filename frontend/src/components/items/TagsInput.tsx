import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Chip, Dot } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type { ColorKey } from '@/types'

export interface TagOption {
  name: string
  color: ColorKey
}

export function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').slice(0, 32)
}

/** Controlled list of tag names. New names are allowed; the caller creates them on save. */
export function TagsInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string
  value: string[]
  onChange: (next: string[]) => void
  options: TagOption[]
  placeholder?: string
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const byName = useMemo(() => new Map(options.map((o) => [o.name, o])), [options])

  const suggestions = useMemo(() => {
    const q = normalizeTag(draft)
    return options.filter((o) => !value.includes(o.name) && (!q || o.name.includes(q))).slice(0, 6)
  }, [draft, options, value])

  const add = (raw: string) => {
    const name = normalizeTag(raw)
    if (name && !value.includes(name)) onChange([...value, name])
    setDraft('')
    setActive(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (!draft.trim() && e.key !== ',') return
      e.preventDefault()
      add(open && suggestions[active] && e.key !== ',' ? suggestions[active].name : draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && suggestions.length > 0
  return (
    <div className="relative">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[10px] border border-border bg-surface px-2 py-1.5 transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border-strong">
        {value.map((name) => (
          <Chip
            key={name}
            color={byName.get(name)?.color ?? 'gray'}
            onRemove={() => onChange(value.filter((v) => v !== name))}
            removeLabel={t('editor.removeTag', { name })}
          >
            {name}
          </Chip>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120)
            if (draft.trim()) add(draft)
          }}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint focus-visible:outline-none"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 rounded-[10px] border border-border bg-surface p-1 shadow-pop"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                add(s.name)
              }}
              onMouseMove={() => setActive(i)}
              className={cn(
                'flex h-8 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-sm',
                i === active ? 'bg-subtle text-fg' : 'text-muted',
              )}
            >
              <Dot color={s.color} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
