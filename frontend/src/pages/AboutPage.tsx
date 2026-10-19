import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

const FAQ = [1, 2, 3, 4, 5]

export default function AboutPage() {
  const { t } = useTranslation()
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight">{t('about.title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('about.lead')}</p>

      <h2 className="mt-14 text-xl font-semibold tracking-tight">{t('about.faqTitle')}</h2>
      <div className="mt-4 space-y-3">
        {FAQ.map((n) => (
          <Card key={n} className="px-5 py-4">
            <details className="group">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{t(`about.q${n}`)}</summary>
              <p className="mt-2 text-muted">{t(`about.a${n}`)}</p>
            </details>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Link to="/app" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
          {t('about.cta')}
        </Link>
      </div>
    </div>
  )
}
