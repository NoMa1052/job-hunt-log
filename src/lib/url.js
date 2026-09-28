// Only http(s) links are ever rendered as clickable. Anything else
// (javascript:, data:, etc.) returns null so no link is shown.
export function safeUrl(value) {
  const raw = (value || '').trim()
  if (!raw) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
