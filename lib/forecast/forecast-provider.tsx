'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { createLocalPreference } from '@/lib/local-preference'
import { buildDemoTransactions } from '@/lib/transactions/demo'
import { withPlannedTransactions } from '@/lib/transactions/list'
import type { Transaction, TransactionInput } from '@/lib/transactions/types'
import { buildDemoForecast } from './demo'
import { ENGINE_CONNECTED, fetchEngineForecast } from './engine'
import type { Adjustment } from './scenario'
import { summarize, type ForecastSummary } from './summary'
import type { Forecast, ScenarioId } from './types'

export interface AppliedWhatIf {
  description: string
  adjustments: Adjustment[]
}

export const FOLLOW_UP_STATUSES = ['notContacted', 'reminded', 'promised', 'received'] as const
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

const demoStore = createLocalPreference<'on'>('captidict.demo', (raw) => (raw === 'on' ? 'on' : null))

interface ForecastContextValue {
  scenario: ScenarioId
  setScenario: (scenario: ScenarioId) => void
  demo: boolean
  setDemo: (on: boolean) => void
  engineConnected: boolean
  forecast: Forecast | null | undefined
  /** Unmodified base-scenario forecast, used as the starting point for what-if previews. */
  baseForecast: Forecast | null | undefined
  /** What-if applied for this session only. It is kept in memory and never written back to the forecast. */
  appliedWhatIf: AppliedWhatIf | null
  setAppliedWhatIf: (whatIf: AppliedWhatIf | null) => void
  /** Chase-list follow-up notes keyed by receivable id. Session-only: kept in memory, never persisted or sent. */
  followUps: Record<string, FollowUpStatus>
  setFollowUp: (receivableId: string, status: FollowUpStatus) => void
  /**
   * Single source of truth for transaction records. Session-only: kept in memory, never persisted or sent.
   * Demo mode shows only the demo set (adds go there too); real entries show only outside demo mode. Entries dated inside the forecast window are included in `forecast`
   * and `baseForecast`, so Home, Forecast, Warnings, What-if and the spending check all see them.
   */
  transactions: Transaction[]
  addTransaction: (input: TransactionInput) => void
  updateTransaction: (id: string, input: TransactionInput) => void
  deleteTransaction: (id: string) => void
  summary: ForecastSummary | null
  isLoading: boolean
  error: unknown
  retry: () => void
}

const ForecastContext = createContext<ForecastContextValue | null>(null)

function newTransactionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function loadForecast([, scenario, demo]: readonly [string, ScenarioId, boolean]) {
  if (demo) return buildDemoForecast(scenario)
  return fetchEngineForecast(scenario)
}

export function ForecastProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<ScenarioId>('base')
  const [appliedWhatIf, setAppliedWhatIf] = useState<AppliedWhatIf | null>(null)
  const [followUps, setFollowUps] = useState<Record<string, FollowUpStatus>>({})
  const [demoPref, setDemoPref] = demoStore.usePreference()
  const demo = demoPref === 'on'
  const hydrated = demoPref !== undefined

  const { data, error, isLoading, mutate } = useSWR(
    hydrated ? (['forecast', scenario, demo] as const) : null,
    loadForecast,
    { keepPreviousData: true, revalidateOnFocus: false },
  )

  const { data: baseData } = useSWR(hydrated ? (['forecast', 'base', demo] as const) : null, loadForecast, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const [userTransactions, setUserTransactions] = useState<Transaction[]>([])
  // `null` means the demo sample is untouched; it is only materialised once a demo row is edited or deleted.
  const [demoTransactions, setDemoTransactions] = useState<Transaction[] | null>(null)
  const demoSample = useMemo(() => (demo ? buildDemoTransactions() : []), [demo])
  // Demo and real records never mix: demo mode shows (and edits) only the labelled demo set.
  const transactions = useMemo(
    () => (demo ? (demoTransactions ?? demoSample) : userTransactions),
    [demo, demoTransactions, demoSample, userTransactions],
  )

  const updateRows = useCallback(
    (id: string, update: (rows: Transaction[]) => Transaction[]) => {
      if (id.startsWith('demo-')) setDemoTransactions((rows) => update(rows ?? demoSample))
      else setUserTransactions(update)
    },
    [demoSample],
  )

  const forecast = useMemo(() => (data ? withPlannedTransactions(data, transactions) : data), [data, transactions])
  const baseForecast = useMemo(() => (baseData ? withPlannedTransactions(baseData, transactions) : baseData), [baseData, transactions])

  const summary = useMemo(() => (forecast && forecast.days.length > 0 ? summarize(forecast) : null), [forecast])

  const value: ForecastContextValue = {
    scenario,
    setScenario,
    demo,
    setDemo: (on) => {
      setDemoPref(on ? 'on' : null)
      setAppliedWhatIf(null)
      setFollowUps({})
      setDemoTransactions(null)
      if (!on) setScenario('base')
    },
    baseForecast,
    appliedWhatIf,
    setAppliedWhatIf,
    followUps,
    setFollowUp: (receivableId, status) => setFollowUps((current) => ({ ...current, [receivableId]: status })),
    engineConnected: ENGINE_CONNECTED,
    forecast,
    transactions,
    addTransaction: (input) =>
      demo
        ? setDemoTransactions((rows) => [{ ...input, id: `demo-${newTransactionId()}`, source: 'demo' }, ...(rows ?? demoSample)])
        : setUserTransactions((rows) => [{ ...input, id: newTransactionId(), source: 'user' }, ...rows]),
    updateTransaction: (id, input) => updateRows(id, (rows) => rows.map((row) => (row.id === id ? { ...row, ...input } : row))),
    deleteTransaction: (id) => updateRows(id, (rows) => rows.filter((row) => row.id !== id)),
    summary,
    isLoading: !hydrated || isLoading,
    error,
    retry: () => void mutate(),
  }

  return <ForecastContext.Provider value={value}>{children}</ForecastContext.Provider>
}

export function useForecast() {
  const context = useContext(ForecastContext)
  if (!context) throw new Error('useForecast must be used within ForecastProvider')
  return context
}
