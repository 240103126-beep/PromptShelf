import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { LanguageSwitcher, Logo, ThemeToggle } from './HeaderControls'

function SiteHeader() {
  const { t } = useTranslation()
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('text-sm transition-colors duration-150', isActive ? 'text-fg' : 'text-muted hover:text-fg')
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label={t('nav.mainNav')} className="hidden items-center gap-6 sm:flex">
          <NavLink to="/" end className={link}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/about" className={link}>
            {t('nav.about')}
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/app" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}>
            {t('nav.openApp')}
          </Link>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-muted">{t('footer.tagline')}</p>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">{t('footer.product')}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link to="/app" className="text-muted hover:text-fg">
                {t('nav.library')}
              </Link>
            </li>
            <li>
              <Link to="/app/import" className="text-muted hover:text-fg">
                {t('nav.import')}
              </Link>
            </li>
            <li>
              <Link to="/app/export" className="text-muted hover:text-fg">
                {t('nav.export')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">{t('footer.resources')}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link to="/about" className="text-muted hover:text-fg">
                {t('nav.about')}
              </Link>
            </li>
            <li>
              <Link to="/about#faq" className="text-muted hover:text-fg">
                {t('footer.faq')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-4 py-6 text-xs text-faint sm:px-6">
        {t('footer.rights', { year })}
      </div>
    </footer>
  )
}

export function PublicLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
