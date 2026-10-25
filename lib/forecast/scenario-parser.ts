import { addDays, parseISODate } from '@/lib/dates'
import type { Adjustment, ShiftTarget } from './scenario'
import type { FlowCategory, Forecast } from './types'

/**
 * Transparent, rule-based parser for what-if descriptions. This is keyword matching, not AI:
 * it recognises a small set of phrases in English, Hindi and Kannada and reports anything it can't read.
 */

// Commas inside Indian-grouped numbers (₹1,25,000) must not split clauses, hence `,(?!\d)`.
const CLAUSE_SPLIT = /[;\n]+|\.(?!\d)|,(?!\d)|\band\b|\bthen\b|\balso\b|और|तथा|ಮತ್ತು/i

const KEYWORDS = {
  late: ['late', 'delay', 'delayed', 'postpone', 'postponed', 'push', 'pushed', 'defer', 'later', 'देर', 'देरी', 'टाल', 'बाद में', 'विलंब', 'ತಡ', 'ತಡವಾಗಿ', 'ಮುಂದೂಡ', 'ವಿಳಂಬ'],
  early: ['early', 'earlier', 'sooner', 'advance', 'ahead', 'जल्दी', 'पहले', 'ಬೇಗ', 'ಮುಂಚಿತ', 'ಮೊದಲೇ'],
  expense: ['expense', 'spend', 'spending', 'buy', 'purchase', 'repair', 'cost', 'unexpected', 'emergency', 'pay out', 'खर्च', 'खरीद', 'मरम्मत', 'अचानक', 'ಖರ್ಚು', 'ಖರೀದಿ', 'ದುರಸ್ತಿ', 'ಅನಿರೀಕ್ಷಿತ'],
  income: ['extra income', 'new order', 'bonus', 'windfall', 'receive extra', 'additional income', 'receive', 'receiving', 'get paid', 'incoming', 'अतिरिक्त आय', 'नया ऑर्डर', 'मिलेंगे', 'मिलेगा', 'मिलेगी', 'प्राप्त होंगे', 'ಹೆಚ್ಚುವರಿ ಆದಾಯ', 'ಹೊಸ ಆರ್ಡರ್', 'ಸಿಗಲಿದೆ', 'ಸಿಗುತ್ತದೆ', 'ಸಿಗುತ್ತೆ', 'ಬರಲಿದೆ'],
  move: ['move', 'reschedule', 'shift', 'खिसका', 'स्थानांतरित', 'ले जाएँ', 'ले जाओ', 'ಸರಿಸಿ', 'ಸ್ಥಳಾಂತರಿಸಿ', 'ವರ್ಗಾಯಿಸಿ'],
  dayAfterTomorrow: ['day after tomorrow', 'परसों', 'ನಾಡಿದ್ದು'],
  tomorrow: ['tomorrow', 'कल', 'ನಾಳೆ'],
  today: ['today', 'आज', 'ಇಂದು'],
  nextWeek: ['next week', 'अगले हफ्ते', 'अगले हफ़्ते', 'अगले सप्ताह', 'ಮುಂದಿನ ವಾರ'],
} as const

/** Weekday names, Sunday first (matches `Date#getDay`). English uses word boundaries; Indic scripts use substring match. */
const WEEKDAYS: { en: RegExp; words: string[] }[] = [
  { en: /\bsunday\b/, words: ['रविवार', 'ಭಾನುವಾರ'] },
  { en: /\bmonday\b/, words: ['सोमवार', 'ಸೋಮವಾರ'] },
  { en: /\btuesday\b/, words: ['मंगलवार', 'ಮಂಗಳವಾರ'] },
  { en: /\bwednesday\b/, words: ['बुधवार', 'ಬುಧವಾರ'] },
  { en: /\bthursday\b/, words: ['गुरुवार', 'बृहस्पतिवार', 'ಗುರುವಾರ'] },
  { en: /\bfriday\b/, words: ['शुक्रवार', 'ಶುಕ್ರವಾರ'] },
  { en: /\bsaturday\b/, words: ['शनिवार', 'ಶನಿವಾರ'] },
]

const CATEGORY_KEYWORDS: Record<Exclude<FlowCategory, 'expense' | 'income'>, string[]> = {
  customer: ['customer', 'customers', 'client', 'buyer', 'receivable', 'ग्राहक', 'ಗ್ರಾಹಕ'],
  supplier: ['supplier', 'suppliers', 'vendor', 'सप्लायर', 'आपूर्तिकर्ता', 'ಪೂರೈಕೆದಾರ', 'ಸಪ್ಲೈಯರ್'],
  rent: ['rent', 'किराया', 'ಬಾಡಿಗೆ'],
  salary: ['salary', 'salaries', 'payroll', 'wages', 'वेतन', 'तनख्वाह', 'ಸಂಬಳ', 'ವೇತನ'],
  tax: ['tax', 'gst', 'टैक्स', 'जीएसटी', 'ತೆರಿಗೆ'],
  utilities: ['utility', 'utilities', 'electricity', 'power bill', 'internet', 'बिजली', 'ಬಿಲ್', 'ವಿದ್ಯುತ್'],
}

const DAY_WORDS = /(\d+)\s*(?:days?|din|दिन|ದಿನ(?:ಗಳು|ಗಳ)?)/i
const WEEK_WORDS = /(\d+)\s*(?:weeks?|हफ्ते|हफ़्ते|सप्ताह|ವಾರ(?:ಗಳು|ಗಳ)?)/i
const IN_DAYS = /(?:in|after)\s+(\d+)\s*days?|(\d+)\s*(?:दिन|ದಿನ)(?:\s*में|\s*ಗಳಲ್ಲಿ|ದಲ್ಲಿ)/i
const AMOUNT =
  /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|l\b|k\b|thousand|लाख|हज़ार|हजार|ಲಕ್ಷ|ಸಾವಿರ)?/gi

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
}

function normalise(text: string) {
  return text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty)\b/g, (word) => String(WORD_NUMBERS[word]))
}

function includesAny(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word))
}

function readDays(text: string) {
  const weeks = text.match(WEEK_WORDS)
  if (weeks) return Number(weeks[1]) * 7
  const days = text.match(DAY_WORDS)
  return days ? Number(days[1]) : null
}

function readAmount(text: string) {
  const withoutDays = text.replace(DAY_WORDS, ' ').replace(WEEK_WORDS, ' ')
  for (const match of withoutDays.matchAll(AMOUNT)) {
    const value = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(value) || value <= 0) continue
    const unit = match[2]?.toLowerCase()
    if (unit && ['lakh', 'lac', 'l', 'लाख', 'ಲಕ್ಷ'].includes(unit)) return Math.round(value * 100_000)
    if (unit && ['k', 'thousand', 'हज़ार', 'हजार', 'ಸಾವಿರ'].includes(unit)) return Math.round(value * 1_000)
    if (match[0].includes('₹') || /rs|inr/i.test(match[0]) || value >= 100) return Math.round(value)
  }
  return null
}

function readTarget(text: string, parties: string[]): ShiftTarget | null {
  const party = parties.find((name) => text.includes(name.toLowerCase()))
  if (party) return { type: 'party', party }
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (includesAny(text, words)) return { type: 'category', category: category as FlowCategory }
  }
  return null
}

/**
 * Reads a day relative to `asOf`. `explicit` is false when no date words were found (the caller then defaults to today).
 * Weekdays resolve to the next occurrence after `asOf` ("Friday" and "next Friday" both mean the coming Friday);
 * the resolved date is always shown to the user as an editable field.
 */
export function readDate(text: string, asOf: string): { date: string; explicit: boolean } {
  const at = (offset: number) => ({ date: addDays(asOf, offset), explicit: true })
  if (includesAny(text, KEYWORDS.dayAfterTomorrow)) return at(2)
  if (includesAny(text, KEYWORDS.tomorrow)) return at(1)
  const match = text.match(IN_DAYS)
  if (match) return at(Number(match[1] ?? match[2]))
  if (includesAny(text, KEYWORDS.nextWeek)) return at(7)
  const today = parseISODate(asOf).getDay()
  const weekday = WEEKDAYS.findIndex(({ en, words }) => en.test(text) || includesAny(text, words))
  if (weekday !== -1) return at((weekday - today + 7) % 7 || 7)
  if (includesAny(text, KEYWORDS.today)) return at(0)
  return { date: asOf, explicit: false }
}

/** Extra context for a parsed `move`, so the UI can explain what it picked or why it needs the user's choice. */
export type MoveHint = { code: 'noMatch'; amount?: number } | { code: 'multiple'; count: number }

export interface ParseResult {
  adjustments: Adjustment[]
  unrecognised: string[]
  /** Keyed by adjustment id. */
  hints: Record<string, MoveHint>
}

let sequence = 0
const nextId = () => `wi-${Date.now().toString(36)}-${(sequence++).toString(36)}`

export function parseScenario(input: string, forecast: Forecast): ParseResult {
  const parties = [...new Set(forecast.days.flatMap((day) => day.flows).map((flow) => flow.party).filter(Boolean) as string[])]
    .sort((a, b) => b.length - a.length)
  const adjustments: Adjustment[] = []
  const unrecognised: string[] = []
  const hints: Record<string, MoveHint> = {}
  const scheduled = forecast.days.flatMap((day) => day.flows).filter((flow) => !flow.isScenario)

  for (const rawClause of input.split(CLAUSE_SPLIT)) {
    const original = rawClause?.trim()
    if (!original) continue
    const clause = normalise(original)
    const amount = readAmount(clause)
    const target = readTarget(clause, parties)
    const isIncome = includesAny(clause, KEYWORDS.income)
    const isExpense = includesAny(clause, KEYWORDS.expense)
    const when = readDate(clause, forecast.asOf)

    // "Move my ₹5,000 payment to next Friday": one scheduled item, identified by amount and/or name, to an exact date.
    if (includesAny(clause, KEYWORDS.move) && when.explicit && (amount !== null || target)) {
      const matches = scheduled
        .filter((flow) => amount === null || flow.amount === amount)
        .filter((flow) => {
          if (!target) return true
          if (target.type === 'party') return flow.party?.toLowerCase() === target.party.toLowerCase()
          return flow.category === target.category
        })
        .sort((a, b) => a.date.localeCompare(b.date))
      const id = nextId()
      adjustments.push({ id, kind: 'move', flowId: matches[0]?.id ?? '', date: when.date })
      if (matches.length === 0) hints[id] = { code: 'noMatch', amount: amount ?? undefined }
      else if (matches.length > 1) hints[id] = { code: 'multiple', count: matches.length }
      continue
    }

    if (amount !== null && (isIncome || isExpense) && !(target && readDays(clause) !== null)) {
      adjustments.push({ id: nextId(), kind: isIncome ? 'income' : 'expense', amount, date: when.date })
      continue
    }

    const days = readDays(clause)
    const early = includesAny(clause, KEYWORDS.early)
    const late = includesAny(clause, KEYWORDS.late)
    if (target && days !== null && days > 0 && (early || late)) {
      adjustments.push({ id: nextId(), kind: 'shift', target, days: early && !late ? -days : days })
      continue
    }

    unrecognised.push(original)
  }

  return { adjustments, unrecognised, hints }
}
