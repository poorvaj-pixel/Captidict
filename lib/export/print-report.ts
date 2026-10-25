import { downloadBlob } from './csv'
import type { ExportCell, ExportTable } from './types'

export interface ReportFormatters {
  language: string
  currency: (amount: number) => string
  date: (iso: string) => string
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)
}

function renderCell(value: ExportCell, kind: string, fmt: ReportFormatters) {
  if (value === null || value === '') return ''
  if (kind === 'amount' && typeof value === 'number') return escapeHtml(fmt.currency(value))
  if (kind === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return escapeHtml(fmt.date(value))
  return escapeHtml(String(value))
}

/**
 * A self-contained, print-ready HTML document. Printing it through the browser gives a real PDF
 * ("Save as PDF") with correct Kannada / Devanagari shaping and the ₹ sign, which bundled PDF fonts lack.
 */
export function buildReportHtml(table: ExportTable, fmt: ReportFormatters) {
  const head = table.columns
    .map((c) => `<th class="${c.kind === 'amount' ? 'num' : ''}">${escapeHtml(c.label.replace(/\s*\(₹\)$/, ''))}</th>`)
    .join('')
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((cell, i) => `<td class="${table.columns[i].kind === 'amount' ? 'num' : ''}">${renderCell(cell, table.columns[i].kind, fmt)}</td>`).join('')}</tr>`,
    )
    .join('')
  const totals = table.totals
    ? `<tfoot><tr>${table.totals.map((cell, i) => `<td class="${table.columns[i].kind === 'amount' ? 'num' : ''}">${renderCell(cell, table.columns[i].kind, fmt)}</td>`).join('')}</tr></tfoot>`
    : ''
  const meta = table.meta.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')
  const summary = table.summary?.length
    ? `<dl class="summary">${table.summary.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`
    : ''
  const notes = table.notes.map((n) => `<p class="note">${escapeHtml(n)}</p>`).join('')

  return `<!doctype html>
<html lang="${escapeHtml(fmt.language)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(table.fileBase)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&family=Noto+Sans+Kannada:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&display=swap">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Noto Sans', 'Noto Sans Kannada', 'Noto Sans Devanagari', system-ui, sans-serif; color: #1f2a22; font-size: 11px; line-height: 1.45; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #2f5d3f; padding-bottom: 8px; margin-bottom: 12px; }
  .brand { font-weight: 600; color: #2f5d3f; letter-spacing: .02em; font-size: 12px; }
  h1 { margin: 2px 0 0; font-size: 20px; font-weight: 600; }
  dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
  dl div { display: flex; gap: 6px; }
  dt { color: #5b675e; } dd { margin: 0; font-weight: 600; }
  .summary { margin-top: 10px; padding: 10px; border: 1px solid #d9d2bf; border-radius: 8px; background: #faf7ef; }
  .note { margin: 8px 0 0; color: #7a5f1f; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th { text-align: left; font-weight: 600; color: #5b675e; border-bottom: 1px solid #b9b19c; padding: 6px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #ebe6d8; vertical-align: top; }
  tr { break-inside: avoid; }
  tfoot td { font-weight: 600; border-top: 2px solid #2f5d3f; border-bottom: 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .empty { margin-top: 16px; color: #5b675e; }
</style>
</head>
<body>
<header><div><div class="brand">Captidict</div><h1>${escapeHtml(table.title)}</h1></div></header>
<dl>${meta}</dl>
${summary}
${notes}
${table.rows.length > 0 ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${totals}</table>` : ''}
</body>
</html>`
}

/** Opens the browser print dialog for the report in a hidden frame. Resolves once the dialog was requested. */
export function printReport(html: string) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
    const cleanup = () => setTimeout(() => frame.remove(), 60_000)

    frame.onload = async () => {
      try {
        const win = frame.contentWindow
        if (!win) throw new Error('Print frame unavailable')
        await Promise.race([win.document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))])
        win.focus()
        win.print()
        cleanup()
        resolve()
      } catch (error) {
        frame.remove()
        reject(error)
      }
    }
    frame.srcdoc = html
    document.body.appendChild(frame)
  })
}

export function downloadReportHtml(html: string, fileBase: string) {
  const fileName = `${fileBase}.html`
  downloadBlob(html, fileName, 'text/html;charset=utf-8')
  return fileName
}
