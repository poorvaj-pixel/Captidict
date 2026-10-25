'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { createLocalPreference } from '@/lib/local-preference'
import {
  DEFAULT_LANGUAGE,
  DICTIONARIES,
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  type Language,
  type TranslationKey,
  type TranslationVars,
} from './config'
import { formatCurrency, formatDate, formatNumber, type DateStyle } from './format'

const languageStore = createLocalPreference<Language>(LANGUAGE_STORAGE_KEY, (raw) => (isLanguage(raw) ? raw : null))

const reportedMissing = new Set<string>()

function lookup(language: Language, key: string): string | undefined {
  let node: unknown = DICTIONARIES[language]
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

function interpolate(template: string, vars?: TranslationVars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function translate(language: Language, key: TranslationKey, vars?: TranslationVars) {
  const value = lookup(language, key)
  if (value !== undefined) return interpolate(value, vars)

  if (process.env.NODE_ENV !== 'production') {
    const id = `${language}:${key}`
    if (!reportedMissing.has(id)) {
      reportedMissing.add(id)
      console.warn(`[i18n] Missing "${key}" for "${language}", falling back to English.`)
    }
  }
  const fallback = lookup(DEFAULT_LANGUAGE, key)
  return fallback !== undefined ? interpolate(fallback, vars) : ''
}

interface LanguageContextValue {
  /** Active language; English until the user has chosen. */
  language: Language
  /** `undefined` while hydrating, `false` on first launch, `true` once a valid choice is stored. */
  hasChosen: boolean | undefined
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, vars?: TranslationVars) => string
  formatCurrency: (amount: number) => string
  formatNumber: (value: number) => string
  formatDate: (isoDate: string, style?: DateStyle) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = languageStore.usePreference()
  const language = stored ?? DEFAULT_LANGUAGE
  const hasChosen = stored === undefined ? undefined : stored !== null

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useCallback((key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars), [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      hasChosen,
      setLanguage: (next) => setStored(next),
      t,
      formatCurrency,
      formatNumber,
      formatDate: (isoDate, style) => formatDate(isoDate, language, style),
    }),
    [language, hasChosen, setStored, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useI18n must be used within LanguageProvider')
  return context
}
