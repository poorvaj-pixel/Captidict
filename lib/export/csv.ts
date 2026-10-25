import type { ExportCell, ExportTable } from './types'

function escapeCell(value: ExportCell) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  // Prevent spreadsheet formula injection from user-entered names.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value !== 'number' ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const line = (cells: ExportCell[]) => cells.map(escapeCell).join(',')

/** Amounts stay plain numbers (header says ₹) so spreadsheets can total them; dates stay ISO `YYYY-MM-DD`. */
export function tableToCsv(table: ExportTable) {
  const lines: string[] = [line([table.title])]
  for (const [label, value] of table.meta) lines.push(line([label, value]))
  for (const [label, value] of table.summary ?? []) lines.push(line([label, value]))
  for (const note of table.notes) lines.push(line([note]))
  lines.push('')
  lines.push(line(table.columns.map((column) => column.label)))
  for (const row of table.rows) lines.push(line(row))
  if (table.totals) lines.push(line(table.totals))
  return lines.join('\r\n')
}

export function downloadBlob(content: string, fileName: string, type: string) {
  // The BOM makes Excel read UTF-8 Kannada / Hindi text correctly.
  const blob = new Blob(['\uFEFF', content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(table: ExportTable) {
  const fileName = `${table.fileBase}.csv`
  downloadBlob(tableToCsv(table), fileName, 'text/csv;charset=utf-8')
  return fileName
}
