import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { CommandProvider } from '@/providers/CommandProvider'

interface Handle {
  titleKey?: string
}

function DocumentTitle() {
  const { t } = useTranslation()
  const matches = useMatches()
  const { pathname } = useLocation()
  const key = [...matches].reverse().find((m) => (m.handle as Handle | undefined)?.titleKey)?.handle as Handle | undefined
  useEffect(() => {
    const app = t('common.appName')
    document.title = key?.titleKey ? `${t(key.titleKey)} · ${app}` : `${app} — ${t('meta.tagline')}`
  }, [key, t, pathname])
  return null
}

export function RootLayout() {
  return (
    <CommandProvider>
      <DocumentTitle />
      <Outlet />
      <ScrollRestoration />
    </CommandProvider>
  )
}
