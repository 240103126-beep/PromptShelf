import type { Locale } from '@/types'

export function currentLocale(lang: string | undefined): Locale {
  const l = (lang ?? 'en').slice(0, 2)
  return l === 'kk' || l === 'ru' ? l : 'en'
}
