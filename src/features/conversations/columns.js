import { createViewModel } from '../views/model'

// Columns on the Conversations tab. last_contact and talks are worked out
// from the conversation log (see withActivity).
export const PEOPLE_COLUMNS = [
  { key: 'name', label: 'Person', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'last_contact', label: 'Last contact', type: 'date' },
  { key: 'talks', label: 'Talks', type: 'number' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'other_contact', label: 'LinkedIn or other', type: 'text' },
]

export const peopleModel = createViewModel({ columns: PEOPLE_COLUMNS, defaultHidden: ['email', 'phone', 'other_contact'] })

export function withActivity(people, entries) {
  const byPerson = new Map()
  for (const e of entries) {
    const a = byPerson.get(e.person_id) || { talks: 0, last_contact: null }
    a.talks += 1
    if (e.date && (!a.last_contact || e.date > a.last_contact)) a.last_contact = e.date
    byPerson.set(e.person_id, a)
  }
  return people.map(p => ({ ...p, ...(byPerson.get(p.id) || { talks: 0, last_contact: null }) }))
}
