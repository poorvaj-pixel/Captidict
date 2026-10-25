import { addDays, toISODate } from '@/lib/dates'
import type { CashFlow, Forecast, ForecastDay, ScenarioId } from './types'

/** Sample data shown only when the user explicitly opts into demo mode. Always labelled as demo in the UI. */

const OPENING_BALANCE = 170_250
const RESERVE = 50_000
const HORIZON_DAYS = 30

type DemoFlow = Omit<CashFlow, 'date'> & { offset: number }

const DEMO_FLOWS: DemoFlow[] = [
  { id: 'f1', party: 'Krishna Packaging', category: 'supplier', direction: 'out', amount: 38_500, offset: 2 },
  { id: 'f2', party: 'Sharma Traders', category: 'customer', direction: 'in', amount: 42_000, offset: 3 },
  { id: 'f3', party: 'Shree Properties', category: 'rent', direction: 'out', amount: 45_000, offset: 5 },
  { id: 'f4', party: 'BESCOM', category: 'utilities', direction: 'out', amount: 6_800, offset: 7 },
  { id: 'f5', category: 'salary', direction: 'out', amount: 62_000, offset: 10 },
  { id: 'f6', party: 'Patel Textiles', category: 'customer', direction: 'in', amount: 28_000, offset: 12 },
  { id: 'f7', party: 'GST', category: 'tax', direction: 'out', amount: 24_500, offset: 14 },
  { id: 'f8', party: 'Rao Electricals', category: 'supplier', direction: 'out', amount: 31_200, offset: 16 },
  { id: 'f9', party: 'Mehta & Sons', category: 'customer', direction: 'in', amount: 55_000, offset: 18 },
  { id: 'f10', party: 'Krishna Packaging', category: 'supplier', direction: 'out', amount: 18_000, offset: 21 },
  { id: 'f11', party: 'Sharma Traders', category: 'customer', direction: 'in', amount: 36_000, offset: 24 },
  { id: 'f12', party: 'BSNL', category: 'utilities', direction: 'out', amount: 1_999, offset: 26 },
  { id: 'f13', party: 'Rao Electricals', category: 'supplier', direction: 'out', amount: 22_000, offset: 28 },
]

const DEMO_OVERDUE = [
  { id: 'r1', party: 'Gupta Enterprises', amount: 18_500, offset: -6 },
  { id: 'r2', party: 'Nair Agencies', amount: 9_200, offset: -2 },
]

function shiftFor(scenario: ScenarioId, flow: DemoFlow) {
  if (scenario === 'late-customer' && flow.category === 'customer') return 10
  if (scenario === 'delay-supplier' && flow.category === 'supplier') return 7
  return 0
}

export function buildDemoForecast(scenario: ScenarioId, today = new Date()): Forecast {
  const asOf = toISODate(today)
  const flows: CashFlow[] = DEMO_FLOWS.map(({ offset, ...flow }) => ({
    ...flow,
    date: addDays(asOf, offset + shiftFor(scenario, { offset, ...flow })),
  }))

  const days: ForecastDay[] = []
  let balance = OPENING_BALANCE
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = addDays(asOf, i)
    const dayFlows = flows.filter((flow) => flow.date === date)
    for (const flow of dayFlows) balance += flow.direction === 'in' ? flow.amount : -flow.amount
    days.push({ date, closingBalance: balance, flows: dayFlows })
  }

  return {
    source: 'demo',
    scenario,
    asOf,
    currentBalance: OPENING_BALANCE,
    reserve: RESERVE,
    days,
    receivables: [
      ...DEMO_OVERDUE.map(({ offset, ...r }) => ({ ...r, dueDate: addDays(asOf, offset) })),
      ...flows
        .filter((flow) => flow.direction === 'in' && flow.party)
        .map((flow) => ({ id: `r-${flow.id}`, party: flow.party as string, amount: flow.amount, dueDate: flow.date })),
    ],
  }
}
