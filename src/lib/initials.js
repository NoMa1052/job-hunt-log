// Initials for the avatar. From the profile name when there is one: both
// initials from first and last name, or one letter if only one is filled in.
// Otherwise two letters from the email's name part: "pat.lee@…" -> "PL".
export function initialsFromParts(first, last) {
  const f = (first || '').trim()
  const l = (last || '').trim()
  return ((f ? f[0] : '') + (l ? l[0] : '')).toUpperCase()
}

export function initialsFor(email) {
  const name = (email || '').split('@')[0]
  const parts = name.split(/[._+-]+/).map(p => p.replace(/[^a-z]/gi, '')).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}

// "Pat Lee Smith" -> { first: 'Pat', last: 'Lee Smith' }, for profiles saved
// before first and last name were separate.
export function splitName(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}

export const joinName = (first, last) => [first, last].map(s => (s || '').trim()).filter(Boolean).join(' ')
