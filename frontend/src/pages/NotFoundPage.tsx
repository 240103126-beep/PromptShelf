import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <EmptyState
        art="lost"
        title={
          <>
            <span className="mb-2 block text-5xl font-bold tracking-tight text-accent">404</span>
            {t('notFound.title')}
          </>
        }
        body={t('notFound.body')}
        action={
          <Link to="/" className={cn(buttonVariants({ variant: 'primary' }))}>
            {t('notFound.home')}
          </Link>
        }
      />
    </div>
  )
}
