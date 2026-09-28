// Applications and people are linked to a company by name, ignoring case and
// extra spaces ("  ACME   corp" matches "Acme Corp"). "Acme" and "Acme Inc"
// don't match; linking records properly needs a database change later.
export function companyKey(name) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function sameCompany(a, b) {
  const key = companyKey(a)
  return key !== '' && key === companyKey(b)
}
