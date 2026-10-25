export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const INCOME_CATEGORIES = ['sales', 'services', 'refund', 'otherIncome'] as const
export const EXPENSE_CATEGORIES = ['rent', 'utilities', 'supplier', 'salary', 'tax', 'transport', 'marketing', 'otherExpense'] as const
export const TRANSACTION_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number]

export const PAYMENT_METHODS = ['upi', 'cash', 'bank', 'card', 'cheque'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function categoriesFor(type: TransactionType): readonly TransactionCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export interface Transaction {
  id: string
  /** Title exactly as entered — never translated. */
  title: string
  type: TransactionType
  amount: number
  category: TransactionCategory
  date: string
  paymentMethod: PaymentMethod
  notes?: string
  /** `demo` rows are sample records shown only in demo mode; `user` rows were entered in this session. */
  source: 'demo' | 'user'
}

export type TransactionInput = Omit<Transaction, 'id' | 'source'>
