import { addDays, daysBetween } from '@/lib/dates'
import type { CashFlow, FlowCategory, Forecast, ForecastDay } from './types'

/**
 * Frontend what-if layer. It never mutates the forecast it receives: it re-runs the same running-balance
 * rule used by the forecast (closing balance = previous closing + money in − money out for that day)
 * over a copy of the flows with the user's adjustments applied.
 */

export type ShiftTarget = { type: 'category'; category: FlowCategory } | { type: 'party'; party: string }

export type Adjustment =
  | { id: string; kind: 'shift'; target: ShiftTarget; days: number }
  | { id: string; kind: 'expense'; amount: number; date: string; note?: string }
  | { id: string; kind: 'income'; amount: number; date: string; note?: string }
  /** Moves one scheduled item (by its id) to an exact date. `flowId` is empty until the user picks an item. */
  | { id: string; kind: 'move'; flowId: string; date: string }

export function openingBalance(forecast: Forecast) {
  const first = forecast.days[0]
  if (!first) return forecast.currentBalance
  return first.closingBalance - netFlow(first.flows)
}

export function netFlow(flows: CashFlow[]) {
  return flows.reduce((sum, flow) => sum + (flow.direction === 'in' ? flow.amount : -flow.amount), 0)
}

function matchesTarget(flow: CashFlow, target: ShiftTarget) {
  if (target.type === 'party') return flow.party?.toLowerCase() === target.party.toLowerCase()
  return flow.category === target.category
}

export function affectedFlows(forecast: Forecast, adjustment: Adjustment) {
  if (adjustment.kind === 'move') return forecast.days.flatMap((day) => day.flows).filter((flow) => flow.id === adjustment.flowId)
  if (adjustment.kind !== 'shift') return []
  return forecast.days.flatMap((day) => day.flows).filter((flow) => matchesTarget(flow, adjustment.target))
}

export interface ScenarioResult {
  forecast: Forecast
  /** Flows moved past the last forecast day; they no longer affect this 30-day window. */
  movedOutOfRange: CashFlow[]
}

export function applyAdjustments(base: Forecast, adjustments: Adjustment[]): ScenarioResult {
  if (base.days.length === 0 || adjustments.length === 0) return { forecast: base, movedOutOfRange: [] }

  const firstDate = base.days[0].date
  const lastDate = base.days[base.days.length - 1].date
  const clampStart = (date: string) => (daysBetween(firstDate, date) < 0 ? firstDate : date)

  let flows = base.days.flatMap((day) => day.flows)
  for (const adjustment of adjustments) {
    if (adjustment.kind === 'shift') {
      flows = flows.map((flow) =>
        matchesTarget(flow, adjustment.target)
          ? { ...flow, date: clampStart(addDays(flow.date, adjustment.days)) }
          : flow,
      )
    } else if (adjustment.kind === 'move') {
      if (!adjustment.flowId || !adjustment.date) continue
      flows = flows.map((flow) => (flow.id === adjustment.flowId ? { ...flow, date: clampStart(adjustment.date) } : flow))
    } else {
      flows = [
        ...flows,
        {
          id: adjustment.id,
          party: adjustment.note,
          category: adjustment.kind === 'expense' ? 'expense' : 'income',
          direction: adjustment.kind === 'expense' ? 'out' : 'in',
          amount: adjustment.amount,
          date: clampStart(adjustment.date),
          isScenario: true,
        },
      ]
    }
  }

  const movedOutOfRange = flows.filter((flow) => daysBetween(lastDate, flow.date) > 0)
  let balance = openingBalance(base)
  const days: ForecastDay[] = base.days.map(({ date }) => {
    const dayFlows = flows.filter((flow) => flow.date === date)
    balance += netFlow(dayFlows)
    return { date, closingBalance: balance, flows: dayFlows }
  })

  return { forecast: { ...base, days }, movedOutOfRange }
}

export function lowestDay(days: ForecastDay[]) {
  return days.reduce((min, day) => (day.closingBalance < min.closingBalance ? day : min))
}
