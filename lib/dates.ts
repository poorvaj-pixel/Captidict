/** Dates are handled as local calendar days in `YYYY-MM-DD` form to avoid timezone drift. */

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function daysBetween(fromIso: string, toIso: string) {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()
  return Math.round(ms / 86_400_000)
}
