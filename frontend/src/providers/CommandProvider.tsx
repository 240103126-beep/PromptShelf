import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { isTypingTarget } from '@/lib/utils'

export const SEARCH_INPUT_ID = 'library-search'

interface Ctx {
  open: boolean
  setOpen: (open: boolean) => void
  focusSearch: () => void
}

const CommandContext = createContext<Ctx | null>(null)

export function CommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const focusSearch = useCallback(() => {
    const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null
    if (el) {
      el.focus()
      el.select()
    } else {
      navigate('/app', { state: { focusSearch: true } })
    }
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (document.querySelector('dialog[open]')) return
      if (e.key === '/') {
        e.preventDefault()
        focusSearch()
      } else if (e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault()
        navigate('/app/new')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, focusSearch, navigate])

  const value = useMemo(() => ({ open, setOpen, focusSearch }), [open, focusSearch])
  return (
    <CommandContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </CommandContext.Provider>
  )
}

export function useCommand() {
  const ctx = useContext(CommandContext)
  if (!ctx) throw new Error('useCommand must be used inside CommandProvider')
  return ctx
}
