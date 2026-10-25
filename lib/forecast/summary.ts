import { daysBetween } from '@/lib/dates'
import type { CashFlow, CashStatus, Forecast, ForecastDay, Receivable } from './types'

export function statusFor(balance: number, reserve: number): CashStatus {
  if (balance < 0) return 'below'
  if (balance < reserve) return 'near'
  return 'safe'
}

/** 0–100, where reaching the reserve scores 50 and twice the reserve scores 100. */
export function healthScore(lowest: number, reserve: number) {
  if (reserve <= 0) return lowest >= 0 ? 100 : 0
  return Math.max(0, Math.min(100, Math.round((lowest / (reserve * 2)) * 100)))
}

export interface ForecastSummary {
  lowestDay: ForecastDay
  status: CashStatus
  score: number
  nextBill: CashFlow | null
  billsThisWeek: CashFlow[]
  inflowTotal: number
  overdue: (Receivable & { daysOverdue: number })[]
  upcoming: Receivable[]
}

export function summarize(forecast: Forecast): ForecastSummary {
  const lowestDay = forecast.days.reduce((min, day) => (day.closingBalance < min.closingBalance ? day : min))
  const allFlows = forecast.days.flatMap((day) => day.flows)
  const bills = allFlows.filter((flow) => flow.direction === 'out')

  return {
    lowestDay,
    status: statusFor(lowestDay.closingBalance, forecast.reserve),
    score: healthScore(lowestDay.closingBalance, forecast.reserve),
    nextBill: bills[0] ?? null,
    billsThisWeek: bills.filter((bill) => daysBetween(forecast.asOf, bill.date) < 7),
    inflowTotal: allFlows.filter((flow) => flow.direction === 'in').reduce((sum, flow) => sum + flow.amount, 0),
    overdue: forecast.receivables
      .map((r) => ({ ...r, daysOverdue: daysBetween(r.dueDate, forecast.asOf) }))
      .filter((r) => r.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
    upcoming: forecast.receivables.filter((r) => {
      const diff = daysBetween(forecast.asOf, r.dueDate)
      return diff >= 0 && diff < 7
    }),
  }
}
