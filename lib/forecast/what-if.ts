import { daysBetween } from '@/lib/dates'
import { affectedFlows, applyAdjustments, type Adjustment } from './scenario'
import { summarize } from './summary'
import type { CashFlow, CashStatus, Forecast } from './types'

/**
 * What-if Planner helpers. Pure functions on top of `applyAdjustments` and `summarize` — no new forecast maths.
 * Every preview is computed from the unmodified base forecast plus the full list of adjustments, so applying
 * a plan replaces the previous one and nothing is ever counted twice.
 */

export const MAX_AMOUNT = 1_000_000_000
export const MAX_SHIFT_DAYS = 60

export type AdjustmentError = 'amountInvalid' | 'amountTooLarge' | 'dateMissing' | 'dateOutOfRange' | 'daysInvalid' | 'paymentMissing'
export type AdjustmentWarning = 'noMatch' | 'sameDate'

export interface AdjustmentCheck {
  errors: AdjustmentError[]
  warnings: AdjustmentWarning[]
}

export function forecastWindow(forecast: Forecast) {
  return { start: forecast.days[0]?.date ?? forecast.asOf, end: forecast.days[forecast.days.length - 1]?.date ?? forecast.asOf }
}

function checkDate(date: string, forecast: Forecast, errors: AdjustmentError[]) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return errors.push('dateMissing')
  const { start, end } = forecastWindow(forecast)
  if (daysBetween(start, date) < 0 || daysBetween(date, end) < 0) errors.push('dateOutOfRange')
}

export function scheduledFlows(forecast: Forecast): CashFlow[] {
  return forecast.days.flatMap((day) => day.flows).filter((flow) => !flow.isScenario)
}

export function checkAdjustment(adjustment: Adjustment, base: Forecast): AdjustmentCheck {
  const errors: AdjustmentError[] = []
  const warnings: AdjustmentWarning[] = []

  if (adjustment.kind === 'income' || adjustment.kind === 'expense') {
    if (!Number.isFinite(adjustment.amount) || adjustment.amount <= 0) errors.push('amountInvalid')
    else if (adjustment.amount > MAX_AMOUNT) errors.push('amountTooLarge')
    checkDate(adjustment.date, base, errors)
  } else if (adjustment.kind === 'shift') {
    const days = Math.abs(adjustment.days)
    if (!Number.isInteger(adjustment.days) || days < 1 || days > MAX_SHIFT_DAYS) errors.push('daysInvalid')
    if (affectedFlows(base, adjustment).length === 0) warnings.push('noMatch')
  } else {
    const flow = scheduledFlows(base).find((item) => item.id === adjustment.flowId)
    if (!flow) errors.push('paymentMissing')
    checkDate(adjustment.date, base, errors)
    if (flow && flow.date === adjustment.date) warnings.push('sameDate')
  }

  return { errors, warnings }
}

/** Identity of an adjustment without its id — used to avoid adding the same change twice. */
export function adjustmentSignature(adjustment: Adjustment) {
  const { id: _id, ...rest } = adjustment
  if (rest.kind === 'income' || rest.kind === 'expense') return JSON.stringify({ ...rest, note: rest.note?.trim() || undefined })
  return JSON.stringify(rest)
}

export function samePlan(a: Adjustment[], b: Adjustment[]) {
  if (a.length !== b.length) return false
  return a.every((item, index) => adjustmentSignature(item) === adjustmentSignature(b[index]))
}

/** Adds `incoming` to `existing`, skipping changes that are already present. */
export function mergeAdjustments(existing: Adjustment[], incoming: Adjustment[]) {
  const seen = new Set(existing.map(adjustmentSignature))
  const added: Adjustment[] = []
  let duplicates = 0
  for (const adjustment of incoming) {
    const signature = adjustmentSignature(adjustment)
    if (seen.has(signature)) {
      duplicates++
      continue
    }
    seen.add(signature)
    added.push(adjustment)
  }
  return { adjustments: [...existing, ...added], added, duplicates }
}

export interface ForecastSnapshot {
  lowestBalance: number
  lowestDate: string
  reserve: number
  /** Lowest balance minus reserve; negative means under the reserve. */
  reserveMargin: number
  status: CashStatus
  closingBalance: number
  closingDate: string
}

export function snapshotOf(forecast: Forecast): ForecastSnapshot {
  const summary = summarize(forecast)
  const last = forecast.days[forecast.days.length - 1]
  return {
    lowestBalance: summary.lowestDay.closingBalance,
    lowestDate: summary.lowestDay.date,
    reserve: forecast.reserve,
    reserveMargin: summary.lowestDay.closingBalance - forecast.reserve,
    status: summary.status,
    closingBalance: last.closingBalance,
    closingDate: last.date,
  }
}

export interface WhatIfPreview {
  original: ForecastSnapshot
  adjusted: ForecastSnapshot
  adjustedForecast: Forecast
  movedOutOfRange: CashFlow[]
  /** Adjusted lowest minus original lowest. Positive is better. */
  lowestDelta: number
}

/** Preview-only. `base` is never modified; `applyAdjustments` works on copies. */
export function previewWhatIf(base: Forecast, adjustments: Adjustment[]): WhatIfPreview {
  const { forecast: adjustedForecast, movedOutOfRange } = applyAdjustments(base, adjustments)
  const original = snapshotOf(base)
  const adjusted = snapshotOf(adjustedForecast)
  return { original, adjusted, adjustedForecast, movedOutOfRange, lowestDelta: adjusted.lowestBalance - original.lowestBalance }
}
