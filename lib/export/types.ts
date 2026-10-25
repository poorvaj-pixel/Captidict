export type ColumnKind = 'text' | 'date' | 'amount'

export interface ExportColumn {
  label: string
  kind: ColumnKind
}

export type ExportCell = string | number | null

/** A table built only from records already present in the forecast — exports never add rows of their own. */
export interface ExportTable {
  /** File name without extension, e.g. `captidict-bills-2026-10-25`. */
  fileBase: string
  title: string
  /** Label/value pairs shown above the table (source, scenario, filter, generated date…). */
  meta: [string, string][]
  /** Optional label/value summary figures, already formatted for display. */
  summary?: [string, string][]
  columns: ExportColumn[]
  rows: ExportCell[][]
  /** Totals row aligned with `columns`. */
  totals?: ExportCell[]
  notes: string[]
}
