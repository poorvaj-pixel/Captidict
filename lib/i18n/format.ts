import { LANGUAGE_META, type Language } from './config'
import { parseISODate } from '@/lib/dates'

/*
 * Currency always uses en-IN rules: Node/ICU formats kn-IN with Western grouping (₹170,250),
 * while Indian grouping (₹1,70,250) is required for every language. Digits are forced to Latin.
 */
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  numberingSystem: 'latn',
})

const numberFormatter = new Intl.NumberFormat('en-IN', { numberingSystem: 'latn', maximumFractionDigits: 0 })

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount)
}

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
  numberingSystem: 'latn',
})

/** Short axis labels such as ₹1.7L / ₹45K. */
export function formatCompactCurrency(amount: number) {
  return compactCurrencyFormatter.format(amount)
}

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()

export type DateStyle = 'short' | 'long' | 'weekday' | 'dayNumber'

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  weekday: { weekday: 'short' },
  dayNumber: { day: 'numeric' },
}

export function formatDate(isoDate: string, language: Language, style: DateStyle = 'short') {
  const cacheKey = `${language}:${style}`
  let formatter = dateFormatterCache.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LANGUAGE_META[language].intlLocale, {
      ...DATE_OPTIONS[style],
      numberingSystem: 'latn',
    })
    dateFormatterCache.set(cacheKey, formatter)
  }
  return formatter.format(parseISODate(isoDate))
}
