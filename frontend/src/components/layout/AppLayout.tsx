import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Ellipsis, FolderClosed, Info, LibraryBig, MessagesSquare, Plus, Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd, Skeleton } from '@/components/ui/primitives'
import { useCollections } from '@/hooks/useData'
import { cn, isMac } from '@/lib/utils'
import { useCommand } from '@/providers/CommandProvider'
import { LanguageSwitcher, Logo, ThemeToggle } from './HeaderControls'
import { APP_NAV } from './nav'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-8 items-center gap-2.5 rounded-[8px] px-2.5 text-sm transition-colors duration-150 [&_svg]:size-4 [&_svg]:shrink-0',
    isActive ? 'bg-surface font-medium text-fg shadow-[0_0_0_1px_var(--border)]' : 'text-muted hover:bg-subtle hover:text-fg',
  )

function Sidebar() {
  const { t } = useTranslation()
  const { setOpen } = useCommand()
  const { data: collections, isLoading } = useCollections()
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-3 py-4 md:flex">
      <div className="px-2.5 pb-4">
        <Logo to="/app" />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 flex h-8 items-center gap-2 rounded-[8px] border border-border bg-surface px-2.5 text-sm text-faint transition-colors duration-150 hover:border-border-strong"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">{t('nav.search')}</span>
        <Kbd>{isMac() ? '⌘' : 'Ctrl'} K</Kbd>
      </button>
      <Link to="/app/new" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'mb-5 justify-start px-2.5')}>
        <Plus aria-hidden />
        <span className="flex-1 text-left">{t('nav.newItem')}</span>
        <kbd className="rounded-[5px] bg-white/15 px-1.5 text-[11px] font-medium">N</kbd>
      </Link>

      <nav aria-label={t('nav.mainNav')} className="flex flex-col gap-0.5">
        {APP_NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navItemClass}>
            <Icon aria-hidden />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">{t('nav.collections')}</div>
        <ul className="flex flex-col gap-0.5">
          {isLoading &&
            [0, 1, 2].map((i) => (
              <li key={i} className="px-2.5 py-1.5">
                <Skeleton className="h-4 w-32" />
              </li>
            ))}
          {collections?.map((c) => (
            <li key={c.id}>
              <NavLink to={`/app/collections/${c.id}`} className={navItemClass}>
                <FolderClosed aria-hidden />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs tabular-nums text-faint">{c.itemCount}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-1 pt-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  )
}

function MobileHeader() {
  const { t } = useTranslation()
  const { setOpen } = useCommand()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-bg/90 px-4 backdrop-blur md:hidden">
      <Logo to="/app" />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('nav.search')}
          className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-subtle hover:text-fg"
        >
          <Search className="size-4" aria-hidden />
        </button>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}

function BottomNav() {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = ['/app/tags', '/app/import', '/app/export', '/app/settings'].some((p) => pathname.startsWith(p))
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150 [&_svg]:size-5',
      isActive ? 'text-fg' : 'text-faint',
    )
  return (
    <>
      <nav
        aria-label={t('nav.mobileNav')}
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <NavLink to="/app" end className={tab}>
          <LibraryBig aria-hidden />
          {t('nav.library')}
        </NavLink>
        <NavLink to="/app/collections" className={tab}>
          <FolderClosed aria-hidden />
          {t('nav.collections')}
        </NavLink>
        <div className="flex flex-1 items-center justify-center">
          <Link
            to="/app/new"
            aria-label={t('nav.newItem')}
            className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg"
          >
            <Plus className="size-5" aria-hidden />
          </Link>
        </div>
        <NavLink to="/app/assistant" className={tab}>
          <MessagesSquare aria-hidden />
          {t('nav.assistant')}
        </NavLink>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={tab({ isActive: moreActive })}
        >
          <Ellipsis aria-hidden />
          {t('nav.more')}
        </button>
      </nav>
      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')} className="mb-4 mt-auto">
        <ul className="-mx-2 flex flex-col gap-0.5">
          {APP_NAV.filter((n) => ['/app/tags', '/app/import', '/app/export', '/app/settings'].includes(n.to)).map(
            ({ to, key, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} onClick={() => setMoreOpen(false)} className={(s) => cn(navItemClass(s), 'h-11')}>
                  <Icon aria-hidden />
                  {t(key)}
                </NavLink>
              </li>
            ),
          )}
          <li>
            <NavLink to="/about" onClick={() => setMoreOpen(false)} className={(s) => cn(navItemClass(s), 'h-11')}>
              <Info aria-hidden />
              {t('nav.about')}
            </NavLink>
          </li>
        </ul>
      </Dialog>
    </>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main id="main" tabIndex={-1} className="flex-1 px-4 pb-28 pt-6 outline-none sm:px-8 md:pb-16 md:pt-10 lg:px-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
