import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SortKey, Source } from '@/types'

export type Theme = 'light' | 'dark' | 'system'
export type ViewMode = 'list' | 'grid'

export interface Preferences {
  theme: Theme
  view: ViewMode
  sort: SortKey
  source: Source
  aiPanel: boolean
}

const DEFAULTS: Preferences = { theme: 'system', view: 'list', sort: 'updated', source: 'chatgpt', aiPanel: true }
const PREFS_KEY = 'ps-prefs'
const THEME_KEY = 'ps-theme'

function load(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    const theme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? DEFAULTS.theme
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}), theme }
  } catch {
    return DEFAULTS
  }
}

interface Ctx {
  prefs: Preferences
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  resolvedTheme: 'light' | 'dark'
  toggleTheme: () => void
}

const PreferencesContext = createContext<Ctx | null>(null)

const prefersDark = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
      m.setAttribute('content', resolvedTheme === 'dark' ? '#0B0B0C' : '#FAFAF9'),
    )
  }, [resolvedTheme])

  const setPref = useCallback<Ctx['setPref']>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      try {
        const { theme, ...rest } = next
        localStorage.setItem(THEME_KEY, theme)
        localStorage.setItem(PREFS_KEY, JSON.stringify(rest))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [])

  const toggleTheme = useCallback(() => setPref('theme', resolvedTheme === 'dark' ? 'light' : 'dark'), [resolvedTheme, setPref])

  const value = useMemo(() => ({ prefs, setPref, resolvedTheme, toggleTheme }), [prefs, setPref, resolvedTheme, toggleTheme])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}
