import { applyAdjustments, lowestDay } from './scenario'
import { statusFor } from './summary'
import type { CashStatus, Forecast } from './types'

export type SpendVerdict = 'safe' | 'risky' | 'notNow'

const VERDICT_FOR_STATUS: Record<CashStatus, SpendVerdict> = { safe: 'safe', near: 'risky', below: 'notNow' }
const VERDICT_RANK: Record<SpendVerdict, number> = { safe: 0, risky: 1, notNow: 2 }

export interface SpendCheckResult {
  verdict: SpendVerdict
  lowestBalance: number
  lowestDate: string
  reserve: number
  /** Lowest balance minus reserve; negative means under the reserve. */
  reserveMargin: number
  saferDate: { date: string; verdict: SpendVerdict; lowestBalance: number } | null
}

function evaluate(forecast: Forecast, amount: number, date: string) {
  const { forecast: preview } = applyAdjustments(forecast, [{ id: 'spend-check', kind: 'expense', amount, date }])
  const lowest = lowestDay(preview.days)
  return { lowest, verdict: VERDICT_FOR_STATUS[statusFor(lowest.closingBalance, forecast.reserve)] }
}

/** Preview-only: evaluates a one-off expense against a copy of the forecast. The forecast itself is never modified. */
export function checkSpend(forecast: Forecast, amount: number, date: string): SpendCheckResult {
  const { lowest, verdict } = evaluate(forecast, amount, date)

  let saferDate: SpendCheckResult['saferDate'] = null
  if (verdict !== 'safe') {
    for (const day of forecast.days) {
      if (day.date <= date) continue
      const candidate = evaluate(forecast, amount, day.date)
      const best = saferDate ? VERDICT_RANK[saferDate.verdict] : VERDICT_RANK[verdict]
      if (VERDICT_RANK[candidate.verdict] < best) {
        saferDate = { date: day.date, verdict: candidate.verdict, lowestBalance: candidate.lowest.closingBalance }
        if (candidate.verdict === 'safe') break
      }
    }
  }

  return {
    verdict,
    lowestBalance: lowest.closingBalance,
    lowestDate: lowest.date,
    reserve: forecast.reserve,
    reserveMargin: lowest.closingBalance - forecast.reserve,
    saferDate,
  }
}
