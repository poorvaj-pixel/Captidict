export const SCENARIOS = ['base', 'late-customer', 'delay-supplier'] as const
export type ScenarioId = (typeof SCENARIOS)[number]

/** `expense` and `income` are only produced by what-if / spending-check previews, never by the engine. */
export type FlowCategory = 'rent' | 'utilities' | 'supplier' | 'tax' | 'salary' | 'customer' | 'expense' | 'income'

export interface CashFlow {
  id: string
  /** Customer / company name or user note exactly as entered — never translated. */
  party?: string
  category: FlowCategory
  direction: 'in' | 'out'
  amount: number
  date: string
  /** True for flows added by a what-if or spending-check preview. */
  isScenario?: boolean
}

export interface ForecastDay {
  date: string
  closingBalance: number
  flows: CashFlow[]
}

export interface Receivable {
  id: string
  party: string
  amount: number
  dueDate: string
}

export interface Forecast {
  source: 'engine' | 'demo'
  scenario: ScenarioId
  asOf: string
  currentBalance: number
  reserve: number
  days: ForecastDay[]
  receivables: Receivable[]
}

export type CashStatus = 'safe' | 'near' | 'below'
