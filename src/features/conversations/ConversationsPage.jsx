import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { useProfile } from '../../state/ProfileProvider'
import { toCSV, downloadCSV, formatShortDate } from '../../lib/format'
import { sameCompany } from '../../lib/match'
import { Button, ConfirmDialog, FilterPopover, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import PageHeader from '../../components/PageHeader'
import PersonPanel from './PersonPanel'

const EXPORT_HEADERS = [
  { key: 'name', label: 'Person' }, { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'other_contact', label: 'Other Contact' },
  { key: 'date', label: 'Conversation Date' }, { key: 'recommendation', label: 'Recommendation' }, { key: 'notes', label: 'Notes' }
]

export default function ConversationsPage() {
  const { data, add, update, remove, reload } = useData()
  const { profile } = useProfile()
  const people = data.people.rows
  const entries = data.entries.rows

  const [peopleFilters, setPeopleFilters] = useState({})
  const [confirmId, setConfirmId] = useState(null)

  // The open person lives in the URL, so reload, back and shared links work.
  const { personId } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const openPerson = id => navigate({ pathname: id ? `/app/conversations/${id}` : '/app/conversations', search })

  async function addPerson() {
    const row = await add('people', { name: '', company: '', email: '', phone: '', other_contact: '' })
    if (row) openPerson(row.id)
  }
  const updatePerson = (id, field, value) => update('people', id, field, value)

  function passesPeopleFilters(p) {
    const nameF = (peopleFilters.name || '').trim().toLowerCase()
    const companyF = (peopleFilters.company || '').trim().toLowerCase()
    if (nameF && !(p.name || '').toLowerCase().includes(nameF)) return false
    if (companyF && !(p.company || '').toLowerCase().includes(companyF)) return false
    return true
  }
  const entriesFor = personId => entries.filter(e => e.person_id === personId)
  function lastContactFor(personId) {
    const list = entriesFor(personId).map(e => e.date).filter(Boolean).sort()
    return list.length ? list[list.length - 1] : null
  }

  const filteredPeople = people.filter(passesPeopleFilters)
  const openedPerson = personId ? people.find(p => p.id === personId) : null
  const personCompany = openedPerson ? data.companies.rows.find(c => sameCompany(c.company, openedPerson.company)) : null

  // A link to a person that doesn't exist (deleted, or someone else's) falls
  // back to the list once the data has loaded.
  useEffect(() => {
    if (personId && data.people.status === 'ready' && !openedPerson) navigate({ pathname: '/app/conversations', search }, { replace: true })
  }, [personId, openedPerson, data.people.status, navigate, search])

  function exportConversations() {
    const rows = []
    filteredPeople.forEach(p => {
      const personEntries = entriesFor(p.id)
      const base = { name: p.name, company: p.company, email: p.email, phone: p.phone, other_contact: p.other_contact }
      if (personEntries.length === 0) rows.push({ ...base, date: '', recommendation: '', notes: '' })
      else personEntries.forEach(e => rows.push({ ...base, date: e.date || '', recommendation: e.recommendation || '', notes: e.notes || '' }))
    })
    downloadCSV('conversations.csv', toCSV(EXPORT_HEADERS, rows))
  }

  function filterHeader(key, label) {
    return <FilterPopover label={label} value={peopleFilters[key]} onChange={v => setPeopleFilters(prev => ({ ...prev, [key]: v }))} />
  }

  return (
    <section aria-label="Conversations">
      <PageHeader
        title="Conversations"
        actions={<>
          <Button variant="ghost" icon="download" onClick={exportConversations}>Export</Button>
          <Button variant="primary" icon="plus" onClick={addPerson}>Add person</Button>
        </>}
      />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              <th scope="col">{filterHeader('name', 'Person')}</th>
              <th scope="col">{filterHeader('company', 'Company')}</th>
              <th scope="col">Last contact</th>
              <th scope="col" className="center">Talks</th>
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map(p => {
              const last = lastContactFor(p.id)
              return (
                <tr
                  key={p.id}
                  className="row-link"
                  tabIndex={0}
                  aria-selected={personId === p.id}
                  aria-label={`${p.name || 'Unnamed person'}${p.company ? `, ${p.company}` : ''}: open details`}
                  onClick={e => { if (!e.target.closest('a, button')) openPerson(p.id) }}
                  onKeyDown={e => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPerson(p.id) }
                  }}
                >
                  <td className="sk-cell-company">{p.name || <span className="cell-placeholder">Unnamed</span>}</td>
                  <td className="sk-cell-meta">{p.company || '—'}</td>
                  <td className="sk-cell-meta">{last ? formatShortDate(last, undefined, profile.date_format) : '—'}</td>
                  <td className="sk-cell-meta center">{entriesFor(p.id).length}</td>
                  <td className="col-actions"><IconButton icon="x" size="sm" label="Delete person" onClick={() => setConfirmId(p.id)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <CollectionState state={data.people} onRetry={() => { reload('people'); reload('entries') }}>
          {filteredPeople.length === 0 && (
            <div className="empty-state">
              {people.length === 0 ? 'No conversations logged yet. Add a person above.' : 'Nothing matches the current filters.'}
            </div>
          )}
        </CollectionState>
      </div>

      {openedPerson && (
        <PersonPanel
          key={openedPerson.id}
          person={openedPerson}
          entries={entriesFor(openedPerson.id)}
          company={personCompany}
          onUpdate={(field, value) => updatePerson(openedPerson.id, field, value)}
          onAddEntry={({ date, recommendation, notes }) => add('entries', { person_id: openedPerson.id, date, recommendation, notes })}
          onOpenCompany={() => navigate(`/app/companies/${personCompany.id}`)}
          onClose={() => openPerson(null)}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this? This can't be undone."
          onConfirm={() => { remove('people', confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </section>
  )
}
