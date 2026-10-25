import { addDays, toISODate } from '@/lib/dates'
import type { Transaction } from './types'

/**
 * Sample history shown only in demo mode and always labelled as demo. Every entry is dated in the past, so it
 * is history only and never changes the demo forecast (whose opening balance already reflects past activity).
 */
const DEMO_HISTORY: (Omit<Transaction, 'date' | 'source'> & { offset: number })[] = [
  { id: 'demo-t1', title: 'Sharma Traders — invoice #1042', type: 'income', amount: 48_000, category: 'sales', paymentMethod: 'bank', offset: -2 },
  { id: 'demo-t2', title: 'Diesel for delivery van', type: 'expense', amount: 3_200, category: 'transport', paymentMethod: 'upi', offset: -3 },
  { id: 'demo-t3', title: 'Krishna Packaging — boxes', type: 'expense', amount: 21_500, category: 'supplier', paymentMethod: 'bank', offset: -5, notes: 'Part payment, balance due next week' },
  { id: 'demo-t4', title: 'Counter sales', type: 'income', amount: 12_750, category: 'sales', paymentMethod: 'cash', offset: -6 },
  { id: 'demo-t5', title: 'Shop signage repair', type: 'expense', amount: 4_800, category: 'otherExpense', paymentMethod: 'cash', offset: -9 },
  { id: 'demo-t6', title: 'Patel Textiles — installation work', type: 'income', amount: 26_000, category: 'services', paymentMethod: 'upi', offset: -12 },
  { id: 'demo-t7', title: 'Instagram ads', type: 'expense', amount: 2_500, category: 'marketing', paymentMethod: 'card', offset: -15 },
  { id: 'demo-t8', title: 'BESCOM electricity', type: 'expense', amount: 6_450, category: 'utilities', paymentMethod: 'upi', offset: -20 },
  { id: 'demo-t9', title: 'Supplier refund — damaged stock', type: 'income', amount: 3_900, category: 'refund', paymentMethod: 'cheque', offset: -24 },
]

export function buildDemoTransactions(today = new Date()): Transaction[] {
  const asOf = toISODate(today)
  return DEMO_HISTORY.map(({ offset, ...txn }) => ({ ...txn, date: addDays(asOf, offset), source: 'demo' }))
}
