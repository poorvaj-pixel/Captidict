import en from '@/locales/en.json'
import hi from '@/locales/hi.json'
import kn from '@/locales/kn.json'

export const LANGUAGES = ['en', 'kn', 'hi'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'
export const LANGUAGE_STORAGE_KEY = 'captidict.language'

export const LANGUAGE_META: Record<Language, { nativeName: string; short: string; intlLocale: string }> = {
  en: { nativeName: 'English', short: 'EN', intlLocale: 'en-IN' },
  kn: { nativeName: 'ಕನ್ನಡ', short: 'ಕನ್ನಡ', intlLocale: 'kn-IN' },
  hi: { nativeName: 'हिन्दी', short: 'हिन्दी', intlLocale: 'hi-IN' },
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

type Dictionary = typeof en
export const DICTIONARIES: Record<Language, Dictionary> = { en, kn, hi }

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type TranslationKey = Leaves<Dictionary>
export type TranslationVars = Record<string, string | number>
