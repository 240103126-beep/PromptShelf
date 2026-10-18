import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import kk from '@/locales/kk.json'
import ru from '@/locales/ru.json'
import type { Locale } from '@/types'

export const LOCALES: Locale[] = ['kk', 'ru', 'en']
export const LANG_STORAGE_KEY = 'ps-lang'

function detect(): Locale {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored && (LOCALES as string[]).includes(stored)) return stored as Locale
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
  if (nav.startsWith('kk')) return 'kk'
  if (nav.startsWith('ru')) return 'ru'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: { kk: { translation: kk }, ru: { translation: ru }, en: { translation: en } },
  lng: detect(),
  fallbackLng: 'en',
  supportedLngs: LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
})

const syncDocument = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncDocument(i18n.language)

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lng)
  } catch {
    /* storage unavailable */
  }
  syncDocument(lng)
})

export default i18n
