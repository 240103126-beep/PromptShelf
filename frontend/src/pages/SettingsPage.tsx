import { useTranslation } from 'react-i18next'
import { LanguageSwitcher, ThemeToggle } from '@/components/layout/HeaderControls'
import { Card, PageHeader } from '@/components/ui/primitives'

export default function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <div className="font-medium">{t('settings.language')}</div>
            <p className="text-sm text-muted">{t('settings.languageHint')}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <div className="font-medium">{t('settings.theme')}</div>
            <p className="text-sm text-muted">{t('settings.themeHint')}</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="p-5">
          <div className="font-medium">{t('settings.data')}</div>
          <p className="mt-1 text-sm text-muted">{t('settings.dataBody')}</p>
        </div>
      </Card>
    </div>
  )
}
