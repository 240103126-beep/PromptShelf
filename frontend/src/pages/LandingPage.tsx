import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, ClipboardPaste, FileDown, Search, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

function Feature({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-6 shadow-sm">
      <div className="inline-flex size-10 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-20 pb-20 pt-16 sm:gap-32 sm:pt-24">
      {/* Hero */}
      <section className="container mx-auto px-4 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-soft bg-accent-soft px-3 py-1 text-xs font-medium text-accent-text">
          <Sparkles className="size-3" />
          {t('landing.hero.badge')}
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          {t('landing.hero.title')}
          <span className="block text-accent">{t('landing.hero.titleAccent')}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
          {t('landing.hero.description')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/app" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'w-full sm:w-auto')}>
            {t('landing.hero.ctaPrimary')}
            <ArrowRight className="ml-1 size-4" />
          </Link>
          <Link to="/about" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full sm:w-auto')}>
            {t('landing.hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={BookOpen}
            title={t('landing.features.library.title')}
            description={t('landing.features.library.description')}
          />
          <Feature
            icon={Search}
            title={t('landing.features.search.title')}
            description={t('landing.features.search.description')}
          />
          <Feature
            icon={ClipboardPaste}
            title={t('landing.features.import.title')}
            description={t('landing.features.import.description')}
          />
          <Feature
            icon={FileDown}
            title={t('landing.features.export.title')}
            description={t('landing.features.export.description')}
          />
          <Feature
            icon={Sparkles}
            title={t('landing.features.ai.title')}
            description={t('landing.features.ai.description')}
          />
          <Feature
            icon={ArrowRight}
            title={t('landing.features.workflow.title')}
            description={t('landing.features.workflow.description')}
          />
        </div>
      </section>

      {/* Social Proof / CTA */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-[24px] bg-fg px-6 py-16 text-center text-bg dark:bg-surface dark:text-fg">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.cta.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t('landing.cta.description')}</p>
          <div className="mt-10">
            <Link to="/app" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
              {t('landing.cta.button')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
