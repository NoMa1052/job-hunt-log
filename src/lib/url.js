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

// A web link typed as free text ("linkedin.com/in/sam"). Like safeUrl, but a
// bare word with no dot in it ("Sam on Slack") isn't treated as a site.
export function webUrl(value) {
  const href = safeUrl(value)
  if (!href) return null
  return new URL(href).hostname.includes('.') ? href : null
}

// The only other link types allowed: mailto: for an email address and tel:
// for a phone number, both built here from plain values, never taken as-is.
export function mailtoUrl(email) {
  const raw = (email || '').trim()
  // One address, no spaces or characters that could add headers (?, &, etc.).
  if (!/^[^\s@?&#/\\<>(),;:"']+@[^\s@?&#/\\<>(),;:"']+\.[a-z]{2,}$/i.test(raw)) return null
  return `mailto:${raw}`
}

export function telUrl(phone) {
  const raw = (phone || '').trim()
  // Digits and the usual separators only; at least 3 digits.
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 3 || digits.length > 15) return null
  return `tel:${raw.startsWith('+') ? '+' : ''}${digits}`
}
