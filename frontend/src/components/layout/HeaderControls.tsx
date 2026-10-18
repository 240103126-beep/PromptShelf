import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Segmented } from '@/components/ui/primitives'
import { LOCALES } from '@/i18n'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/providers/PreferencesProvider'
import type { Locale } from '@/types'

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="1" y="1" width="22" height="22" rx="6" className="fill-fg" />
        <path d="M6 16.5h12M7.5 7v9.5M10.5 9v7.5M13.4 8.6l2.6 7.6" className="stroke-bg" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <span>{t('common.appName')}</span>
    </Link>
  )
}

const SHORT: Record<Locale, string> = { kk: 'KZ', ru: 'RU', en: 'EN' }

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = (LOCALES as string[]).includes(i18n.resolvedLanguage ?? '') ? (i18n.resolvedLanguage as Locale) : 'en'
  return (
    <Segmented
      size="sm"
      label={t('header.language')}
      value={current}
      onChange={(lng) => i18n.changeLanguage(lng)}
      options={LOCALES.map((l) => ({ value: l, label: SHORT[l], ariaLabel: t(`languages.${l}`) }))}
    />
  )
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, toggleTheme } = usePreferences()
  const dark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? t('header.themeToLight') : t('header.themeToDark')}
      title={dark ? t('header.themeToLight') : t('header.themeToDark')}
      className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  )
}
