import type { SortKey } from '@/lib/forecast/lists'
import { applyAdjustments, type Adjustment } from '@/lib/forecast/scenario'
import type { Forecast } from '@/lib/forecast/types'
import type { Transaction } from './types'

/** True when the transaction falls inside the forecast window and is therefore counted by the forecast. */
export function isInForecastWindow(forecast: Forecast | null | undefined, date: string) {
  const first = forecast?.days[0]?.date
  const last = forecast?.days[forecast.days.length - 1]?.date
  return Boolean(first && last && date >= first && date <= last)
}

/**
 * Adds upcoming transactions (dated inside the forecast window) to a copy of the forecast using the existing
 * running-balance rule in `applyAdjustments`. Past transactions are history only and are never added.
 */
export function withPlannedTransactions(forecast: Forecast, transactions: Transaction[]): Forecast {
  const adjustments: Adjustment[] = transactions
    .filter((txn) => isInForecastWindow(forecast, txn.date))
    .map((txn) => ({ id: `txn-${txn.id}`, kind: txn.type, amount: txn.amount, date: txn.date, note: txn.title }))
  return applyAdjustments(forecast, adjustments).forecast
}

export interface TransactionFilters {
  query: string
  type: 'all' | Transaction['type']
  category: 'all' | Transaction['category']
  from: string
  to: string
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters) {
  const needle = filters.query.trim().toLowerCase()
  return transactions.filter(
    (txn) =>
      (filters.type === 'all' || txn.type === filters.type) &&
      (filters.category === 'all' || txn.category === filters.category) &&
      (!filters.from || txn.date >= filters.from) &&
      (!filters.to || txn.date <= filters.to) &&
      (!needle || txn.title.toLowerCase().includes(needle) || Boolean(txn.notes?.toLowerCase().includes(needle))),
  )
}

export function sortTransactions(transactions: Transaction[], key: SortKey) {
  const sorted = [...transactions]
  const byDate = (a: Transaction, b: Transaction) => a.date.localeCompare(b.date) || b.amount - a.amount
  switch (key) {
    case 'dateAsc':
      return sorted.sort(byDate)
    case 'dateDesc':
      return sorted.sort((a, b) => -byDate(a, b))
    case 'amountDesc':
      return sorted.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date))
    case 'amountAsc':
      return sorted.sort((a, b) => a.amount - b.amount || b.date.localeCompare(a.date))
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title) || b.date.localeCompare(a.date))
  }
}

export function totals(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const txn of transactions) {
    if (txn.type === 'income') income += txn.amount
    else expense += txn.amount
  }
  return { income, expense, net: income - expense }
}
