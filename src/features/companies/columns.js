import { todayLocal } from '../../lib/format'
import { companyKey } from '../../lib/match'
import { createViewModel } from '../views/model'

// Columns on the Companies tab. The counts and last_opened (the local date
// of last_clicked) are worked out in withCounts.
export const COMPANY_COLUMNS = [
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'careers_link', label: 'Careers link', type: 'icon' },
  { key: 'applied', label: 'Applied', type: 'number' },
  { key: 'people', label: 'People', type: 'number' },
  { key: 'last_opened', label: 'Last opened', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'number' },
]

export const companiesModel = createViewModel({ columns: COMPANY_COLUMNS })

export function withCounts(companies, { applications, people, notes }) {
  const count = (rows, field) => {
    const m = new Map()
    for (const r of rows) {
      const k = companyKey(r[field])
      if (k) m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }
  const applied = count(applications, 'company')
  const known = count(people, 'company')
  const noteCount = new Map()
  for (const n of notes) noteCount.set(n.company_id, (noteCount.get(n.company_id) || 0) + 1)
  return companies.map(c => {
    const k = companyKey(c.company)
    return {
      ...c,
      applied: (k && applied.get(k)) || 0,
      people: (k && known.get(k)) || 0,
      notes: noteCount.get(c.id) || 0,
      last_opened: c.last_clicked ? todayLocal(new Date(c.last_clicked)) : null,
    }
  })
}
