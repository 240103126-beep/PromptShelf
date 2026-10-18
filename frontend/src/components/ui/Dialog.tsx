import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  hideHeader,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  hideHeader?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  const { t } = useTranslation()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal()
      else el.setAttribute('open', '')
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close()
      else el.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-[14px] border border-border bg-surface p-0 text-fg shadow-pop backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className={cn('flex items-start justify-between gap-4 px-6 pt-5', hideHeader && 'sr-only')}>
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            {!hideHeader && (
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="-mr-2 -mt-1 inline-flex size-8 items-center justify-center rounded-[8px] text-faint hover:bg-subtle hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          {children && <div className={cn('overflow-y-auto', hideHeader ? '' : 'px-6 py-5')}>{children}</div>}
          {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  loading?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[10px] border border-border bg-surface px-4 text-sm font-medium hover:bg-subtle"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-9 rounded-[10px] bg-danger px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:text-[#0b0b0c]"
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  )
}
