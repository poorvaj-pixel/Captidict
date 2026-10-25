import { toISODate } from '@/lib/dates'
import type { FollowUpStatus } from '@/lib/forecast/forecast-provider'
import { outstandingItems, sumAmounts, type ListItem } from '@/lib/forecast/lists'
import { openingBalance } from '@/lib/forecast/scenario'
import { statusFor, summarize } from '@/lib/forecast/summary'
import type { Forecast } from '@/lib/forecast/types'
import type { TranslationKey, TranslationVars } from '@/lib/i18n/config'
import { STATUS_STYLE } from '@/lib/status-style'
import type { ExportTable } from './types'

export interface ExportContext {
  t: (key: TranslationKey, vars?: TranslationVars) => string
  formatCurrency: (amount: number) => string
  formatDate: (iso: string, style?: 'short' | 'long') => string
  forecast: Forecast
  scenarioLabel: string
  /** Extra label/value lines such as the active filter or search. */
  extraMeta?: [string, string][]
  planApplied?: boolean
}

function baseMeta(ctx: ExportContext): [string, string][] {
  const { t, formatDate, forecast } = ctx
  const meta: [string, string][] = [
    [t('export.generated'), formatDate(toISODate(new Date()), 'long')],
    [t('export.asOf'), formatDate(forecast.asOf, 'long')],
    [t('export.source'), forecast.source === 'demo' ? t('export.sourceDemo') : t('export.sourceEngine')],
    [t('export.scenario'), ctx.scenarioLabel],
  ]
  if (ctx.planApplied) meta.push([t('export.plan'), t('export.planYes')])
  return [...meta, ...(ctx.extraMeta ?? [])]
}

function baseNotes(ctx: ExportContext) {
  const notes: string[] = []
  if (ctx.forecast.source === 'demo') notes.push(ctx.t('export.demoNote'))
  if (ctx.planApplied) notes.push(ctx.t('export.planNote'))
  return notes
}

const stamp = (forecast: Forecast) => forecast.asOf

export function itemName(item: ListItem, t: ExportContext['t']) {
  return item.party ?? t(`category.${item.category}`)
}

export function dueStatus(offset: number, kind: 'bill' | 'receivable', t: ExportContext['t']) {
  if (offset < 0) return t('bills.overdueBy', { days: -offset })
  if (offset === 0) return kind === 'bill' ? t('bills.dueToday') : t('receivables.expectedToday')
  return t('bills.dueIn', { days: offset })
}

export function billsTable(items: ListItem[], ctx: ExportContext): ExportTable {
  const { t } = ctx
  return {
    fileBase: `captidict-bills-${stamp(ctx.forecast)}`,
    title: t('export.titleBills'),
    meta: baseMeta(ctx),
    columns: [
      { label: t('export.colDueDate'), kind: 'date' },
      { label: t('export.colPayee'), kind: 'text' },
      { label: t('export.colCategory'), kind: 'text' },
      { label: t('export.colStatus'), kind: 'text' },
      { label: t('export.colAmount'), kind: 'amount' },
    ],
    rows: items.map((item) => [item.date, itemName(item, t), t(`category.${item.category}`), dueStatus(item.offset, 'bill', t), item.amount]),
    totals: [t('export.total'), t('bills.count', { count: items.length }), null, null, sumAmounts(items)],
    notes: baseNotes(ctx),
  }
}

export function receivablesTable(items: ListItem[], ctx: ExportContext, followUps: Record<string, FollowUpStatus> = {}): ExportTable {
  const { t } = ctx
  const outstanding = outstandingItems(items, followUps)
  const anyReceived = outstanding.length !== items.length
  return {
    fileBase: `captidict-receivables-${stamp(ctx.forecast)}`,
    title: t('export.titleReceivables'),
    meta: baseMeta(ctx),
    columns: [
      { label: t('export.colExpectedDate'), kind: 'date' },
      { label: t('export.colPayer'), kind: 'text' },
      { label: t('export.colStatus'), kind: 'text' },
      { label: t('export.colAmount'), kind: 'amount' },
    ],
    rows: items.map((item) => [
      item.date,
      itemName(item, t),
      followUps[item.id] === 'received' ? t('chase.status.received') : dueStatus(item.offset, 'receivable', t),
      item.amount,
    ]),
    totals: [t('export.totalOutstanding'), t('bills.count', { count: outstanding.length }), null, sumAmounts(outstanding)],
    notes: anyReceived ? [...baseNotes(ctx), t('chase.receivedNote')] : baseNotes(ctx),
  }
}

export function chaseTable(items: ListItem[], followUps: Record<string, FollowUpStatus>, ctx: ExportContext): ExportTable {
  const { t } = ctx
  return {
    fileBase: `captidict-chase-list-${stamp(ctx.forecast)}`,
    title: t('export.titleChase'),
    meta: baseMeta(ctx),
    columns: [
      { label: t('export.colDueDate'), kind: 'date' },
      { label: t('export.colPayer'), kind: 'text' },
      { label: t('export.colStatus'), kind: 'text' },
      { label: t('export.colFollowUp'), kind: 'text' },
      { label: t('export.colAmount'), kind: 'amount' },
    ],
    rows: items.map((item) => [
      item.date,
      itemName(item, t),
      dueStatus(item.offset, 'receivable', t),
      t(`chase.status.${followUps[item.id] ?? 'notContacted'}`),
      item.amount,
    ]),
    totals: [
      t('export.totalOutstanding'),
      t('bills.count', { count: outstandingItems(items, followUps).length }),
      null,
      null,
      sumAmounts(outstandingItems(items, followUps)),
    ],
    notes: [...baseNotes(ctx), t('chase.sessionNote'), t('chase.receivedNote')],
  }
}

export function transactionsTable(ctx: ExportContext): ExportTable {
  const { t, forecast } = ctx
  const flows = forecast.days.flatMap((day) => day.flows.map((flow) => ({ flow, closing: day.closingBalance })))
  const totalIn = flows.reduce((s, { flow }) => s + (flow.direction === 'in' ? flow.amount : 0), 0)
  const totalOut = flows.reduce((s, { flow }) => s + (flow.direction === 'out' ? flow.amount : 0), 0)
  return {
    fileBase: `captidict-transactions-${stamp(forecast)}`,
    title: t('export.titleTransactions'),
    meta: baseMeta(ctx),
    summary: [
      [t('forecast.dayIn'), ctx.formatCurrency(totalIn)],
      [t('forecast.dayOut'), ctx.formatCurrency(totalOut)],
      [t('export.net'), ctx.formatCurrency(totalIn - totalOut)],
    ],
    columns: [
      { label: t('export.colDate'), kind: 'date' },
      { label: t('export.colName'), kind: 'text' },
      { label: t('export.colCategory'), kind: 'text' },
      { label: t('export.colMoneyIn'), kind: 'amount' },
      { label: t('export.colMoneyOut'), kind: 'amount' },
      { label: t('export.colClosing'), kind: 'amount' },
    ],
    rows: flows.map(({ flow, closing }) => [
      flow.date,
      flow.party ?? t(`category.${flow.category}`),
      t(`category.${flow.category}`),
      flow.direction === 'in' ? flow.amount : null,
      flow.direction === 'out' ? flow.amount : null,
      closing,
    ]),
    totals: [t('export.total'), t('bills.count', { count: flows.length }), null, totalIn, totalOut, null],
    notes: [...baseNotes(ctx), t('export.closingNote')],
  }
}

export function forecastSummaryTable(ctx: ExportContext): ExportTable {
  const { t, forecast, formatCurrency, formatDate } = ctx
  const summary = summarize(forecast)
  const margin = summary.lowestDay.closingBalance - forecast.reserve
  const opening = openingBalance(forecast)
  let previous = opening
  const rows = forecast.days.map((day) => {
    const moneyIn = day.flows.filter((f) => f.direction === 'in').reduce((s, f) => s + f.amount, 0)
    const moneyOut = day.flows.filter((f) => f.direction === 'out').reduce((s, f) => s + f.amount, 0)
    const row = [
      day.date,
      previous,
      moneyIn,
      moneyOut,
      day.closingBalance,
      t(STATUS_STYLE[statusFor(day.closingBalance, forecast.reserve)].labelKey),
    ]
    previous = day.closingBalance
    return row
  })
  const totalIn = rows.reduce((s, r) => s + (r[2] as number), 0)
  const totalOut = rows.reduce((s, r) => s + (r[3] as number), 0)
  const last = forecast.days[forecast.days.length - 1]

  return {
    fileBase: `captidict-forecast-summary-${stamp(forecast)}`,
    title: t('export.titleForecast'),
    meta: baseMeta(ctx),
    summary: [
      [t('forecast.currentBalance'), formatCurrency(forecast.currentBalance)],
      [t('forecast.reserveThreshold'), formatCurrency(forecast.reserve)],
      [t('forecast.lowest'), `${formatCurrency(summary.lowestDay.closingBalance)} · ${formatDate(summary.lowestDay.date)}`],
      [t('forecast.reserveMargin'), `${margin >= 0 ? '+' : '−'}${formatCurrency(Math.abs(margin))}`],
      [t('forecast.riskStatus'), t(STATUS_STYLE[summary.status].labelKey)],
      [t('export.closingOn', { date: formatDate(last.date) }), formatCurrency(last.closingBalance)],
    ],
    columns: [
      { label: t('export.colDate'), kind: 'date' },
      { label: t('export.colOpening'), kind: 'amount' },
      { label: t('export.colMoneyIn'), kind: 'amount' },
      { label: t('export.colMoneyOut'), kind: 'amount' },
      { label: t('export.colClosing'), kind: 'amount' },
      { label: t('export.colStatus'), kind: 'text' },
    ],
    rows,
    totals: [t('export.total'), null, totalIn, totalOut, last.closingBalance, null],
    notes: baseNotes(ctx),
  }
}
