import { daysBetween } from '@/lib/dates'
import { statusFor } from './summary'
import type { CashFlow, Forecast, ForecastDay } from './types'

/**
 * Early warnings derived only from the forecast's existing reserve rule (`statusFor`):
 * below zero → Urgent; under the reserve within WARNING_WINDOW_DAYS → Warning; later → Heads up.
 * Overdue receivables that exist in the data are surfaced as Heads up.
 */
export const WARNING_WINDOW_DAYS = 7
const MAX_CONTRIBUTORS = 3
const MAX_ACTIONS = 3

export type WarningSeverity = 'headsUp' | 'warning' | 'urgent'

export type WarningAction =
  | { type: 'followUp'; party: string; amount: number }
  | { type: 'askEarly'; party: string; date: string }
  | { type: 'reviewSupplier'; party: string; date: string }
  | { type: 'holdSpending' }

export interface CashWarning {
  id: string
  severity: WarningSeverity
  kind: 'belowZero' | 'belowReserve' | 'overdue'
  date: string
  balance?: number
  /** Positive amount missing to reach the threshold (zero or reserve). */
  gap?: number
  daysOverdue?: number
  party?: string
  amount?: number
  contributors: CashFlow[]
  actions: WarningAction[]
}

export type AssessmentGap = 'noReserve' | 'shortHorizon' | 'noInflowData'

export interface WarningAssessment {
  warnings: CashWarning[]
  gaps: AssessmentGap[]
}

export const SEVERITY_ORDER: Record<WarningSeverity, number> = { urgent: 0, warning: 1, headsUp: 2 }

function firstCrossing(days: ForecastDay[], isBreached: (day: ForecastDay) => boolean) {
  const index = days.findIndex(isBreached)
  return index === -1 ? null : index
}

function contributorsBefore(days: ForecastDay[], crossingIndex: number, threshold: number) {
  let start = crossingIndex
  while (start > 0 && days[start - 1].closingBalance < threshold) start--
  while (start > 0 && days[start - 1].closingBalance >= threshold && crossingIndex - start < 6) start--
  return days
    .slice(start, crossingIndex + 1)
    .flatMap((day) => day.flows)
    .filter((flow) => flow.direction === 'out')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_CONTRIBUTORS)
}

function actionsFor(forecast: Forecast, contributors: CashFlow[], crossingDate: string): WarningAction[] {
  const actions: WarningAction[] = []
  const overdue = forecast.receivables
    .filter((r) => daysBetween(r.dueDate, forecast.asOf) > 0)
    .sort((a, b) => b.amount - a.amount)
  for (const receivable of overdue) actions.push({ type: 'followUp', party: receivable.party, amount: receivable.amount })

  for (const flow of contributors) {
    if (flow.category === 'supplier' && flow.party) actions.push({ type: 'reviewSupplier', party: flow.party, date: flow.date })
  }

  const laterInflow = forecast.days
    .flatMap((day) => day.flows)
    .find((flow) => flow.direction === 'in' && flow.party && daysBetween(crossingDate, flow.date) > 0)
  if (laterInflow?.party) actions.push({ type: 'askEarly', party: laterInflow.party, date: laterInflow.date })

  actions.push({ type: 'holdSpending' })
  return actions.slice(0, MAX_ACTIONS)
}

export function assessWarnings(forecast: Forecast): WarningAssessment {
  const { days, reserve, asOf } = forecast
  const warnings: CashWarning[] = []
  const gaps: AssessmentGap[] = []

  if (reserve <= 0) gaps.push('noReserve')
  if (days.length < 30) gaps.push('shortHorizon')
  if (!days.some((day) => day.flows.some((flow) => flow.direction === 'in'))) gaps.push('noInflowData')

  const zeroIndex = firstCrossing(days, (day) => statusFor(day.closingBalance, reserve) === 'below')
  const reserveIndex = reserve > 0 ? firstCrossing(days, (day) => statusFor(day.closingBalance, reserve) !== 'safe') : null

  if (reserveIndex !== null && reserveIndex !== zeroIndex) {
    const day = days[reserveIndex]
    const contributors = contributorsBefore(days, reserveIndex, reserve)
    warnings.push({
      id: `reserve-${day.date}`,
      severity: daysBetween(asOf, day.date) < WARNING_WINDOW_DAYS ? 'warning' : 'headsUp',
      kind: 'belowReserve',
      date: day.date,
      balance: day.closingBalance,
      gap: reserve - day.closingBalance,
      contributors,
      actions: actionsFor(forecast, contributors, day.date),
    })
  }

  if (zeroIndex !== null) {
    const day = days[zeroIndex]
    const contributors = contributorsBefore(days, zeroIndex, 0)
    warnings.push({
      id: `zero-${day.date}`,
      severity: 'urgent',
      kind: 'belowZero',
      date: day.date,
      balance: day.closingBalance,
      gap: -day.closingBalance,
      contributors,
      actions: actionsFor(forecast, contributors, day.date),
    })
  }

  for (const receivable of forecast.receivables) {
    const daysOverdue = daysBetween(receivable.dueDate, asOf)
    if (daysOverdue <= 0) continue
    warnings.push({
      id: `overdue-${receivable.id}`,
      severity: 'headsUp',
      kind: 'overdue',
      date: receivable.dueDate,
      party: receivable.party,
      amount: receivable.amount,
      daysOverdue,
      contributors: [],
      actions: [{ type: 'followUp', party: receivable.party, amount: receivable.amount }],
    })
  }

  warnings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.date.localeCompare(b.date))
  return { warnings, gaps }
}
