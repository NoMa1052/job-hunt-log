// Two letters from the email's name part: "pat.lee@…" -> "PL", "nmarx@…" -> "NM".
// From a full name when there is one: "Pat Lee" -> "PL", "Madonna" -> "MA".
export function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}

export function initialsFor(email) {
  const name = (email || '').split('@')[0]
  const parts = name.split(/[._+-]+/).map(p => p.replace(/[^a-z]/gi, '')).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}
