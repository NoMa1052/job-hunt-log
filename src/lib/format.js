// Today's date as YYYY-MM-DD in the user's own timezone (not UTC).
export function todayLocal(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse YYYY-MM-DD as a local calendar date (new Date('2026-07-27') would be
// UTC midnight, which shows as the previous day in the Americas).
export function parseYmd(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

// "Jul 27", or "Jul 27, 2025" when it isn't the current year.
export function formatShortDate(value, now = new Date()) {
  if (!value) return ''
  const d = parseYmd(value) || new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const opts = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}

// Whole calendar days from `from` to `to` (both YYYY-MM-DD).
export function daysBetween(from, to) {
  const a = parseYmd(from)
  const b = parseYmd(to)
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000)
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTimeShort(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function toCSV(headers, rows) {
  const lines = [headers.map(h => csvEscape(h.label)).join(',')]
  rows.forEach(r => { lines.push(headers.map(h => csvEscape(h.value ? h.value(r) : r[h.key])).join(',')) })
  return lines.join('\n')
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
