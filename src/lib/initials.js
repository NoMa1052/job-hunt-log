// Two letters from the email's name part: "pat.lee@…" -> "PL", "nmarx@…" -> "NM".
export function initialsFor(email) {
  const name = (email || '').split('@')[0]
  const parts = name.split(/[._+-]+/).map(p => p.replace(/[^a-z]/gi, '')).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}
