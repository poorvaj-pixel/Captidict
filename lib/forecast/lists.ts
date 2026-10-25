import { daysBetween } from '@/lib/dates'
import { summarize } from './summary'
import type { FlowCategory, Forecast } from './types'

/**
 * Read-only list views derived from records already in the forecast. Screens and exports share these
 * so the totals a user sees on screen are exactly the totals in the exported file.
 */

export const DUE_SOON_DAYS = 7

export interface ListItem {
  id: string
  /** Name as entered — never translated. Bills without a party fall back to their category label. */
  party?: string
  category: FlowCategory
  amount: number
  date: string
  /** Days from the forecast date; negative means overdue. */
  offset: number
}

export function billItems(forecast: Forecast): ListItem[] {
  return forecast.days
    .flatMap((day) => day.flows)
    .filter((flow) => flow.direction === 'out' && !flow.isScenario)
    .map((flow) => ({
      id: flow.id,
      party: flow.party,
      category: flow.category,
      amount: flow.amount,
      date: flow.date,
      offset: daysBetween(forecast.asOf, flow.date),
    }))
}

export function receivableItems(forecast: Forecast): ListItem[] {
  return forecast.receivables.map((r) => ({
    id: r.id,
    party: r.party,
    category: 'customer',
    amount: r.amount,
    date: r.dueDate,
    offset: daysBetween(forecast.asOf, r.dueDate),
  }))
}

/** Same selection as the Home chase card: overdue, plus due within the next 7 days. */
export function chaseItems(forecast: Forecast): ListItem[] {
  const { overdue, upcoming } = summarize(forecast)
  return [...overdue, ...upcoming].map((r) => ({
    id: r.id,
    party: r.party,
    category: 'customer',
    amount: r.amount,
    date: r.dueDate,
    offset: daysBetween(forecast.asOf, r.dueDate),
  }))
}

export const SORT_KEYS = ['dateAsc', 'dateDesc', 'amountDesc', 'amountAsc', 'name'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export function sortItems<T extends ListItem>(items: T[], key: SortKey, nameOf: (item: T) => string): T[] {
  const sorted = [...items]
  const byDate = (a: T, b: T) => a.date.localeCompare(b.date) || b.amount - a.amount
  switch (key) {
    case 'dateAsc':
      return sorted.sort(byDate)
    case 'dateDesc':
      return sorted.sort((a, b) => -byDate(a, b))
    case 'amountDesc':
      return sorted.sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date))
    case 'amountAsc':
      return sorted.sort((a, b) => a.amount - b.amount || a.date.localeCompare(b.date))
    case 'name':
      return sorted.sort((a, b) => nameOf(a).localeCompare(nameOf(b)) || a.date.localeCompare(b.date))
  }
}

export function matchesQuery(query: string, ...fields: (string | undefined)[]) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => field?.toLowerCase().includes(needle))
}

/** Items not marked Received in the session-only follow-up notes. Used for outstanding totals. */
export function outstandingItems<T extends { id: string }>(items: T[], followUps: Record<string, string>): T[] {
  return items.filter((item) => followUps[item.id] !== 'received')
}

export function sumAmounts(items: { amount: number }[]) {
  return items.reduce((sum, item) => sum + item.amount, 0)
}
