import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { useProfile } from '../../state/ProfileProvider'
import { toCSV, downloadCSV, formatShortDate } from '../../lib/format'
import { sameCompany } from '../../lib/match'
import { Button, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import useDeleteConfirm from '../../components/useDeleteConfirm'
import MobileActions from '../../components/MobileActions'
import PageHeader from '../../components/PageHeader'
import RecordCard from '../../components/RecordCard'
import CustomizeMenu from '../views/CustomizeMenu'
import SortHeader from '../views/SortHeader'
import { ViewsBar } from '../views/ViewTabs'
import useViewState from '../views/useViewState'
import PersonPanel from './PersonPanel'
import { peopleModel, withActivity } from './columns'

const EXPORT_HEADERS = [
  { key: 'name', label: 'Person' }, { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'other_contact', label: 'Other Contact' },
  { key: 'date', label: 'Conversation Date' }, { key: 'recommendation', label: 'Recommendation' }, { key: 'notes', label: 'Notes' }
]

const dash = <span aria-label="None">—</span>

export default function ConversationsPage() {
  const { data, add, update, reload } = useData()
  const { profile } = useProfile()
  const entries = data.entries.rows
  const people = useMemo(() => withActivity(data.people.rows, entries), [data.people.rows, entries])
  const deletion = useDeleteConfirm()
  const views = useViewState({ tableName: 'people', model: peopleModel, basePath: '/app/conversations' })
  const { config, setConfig, waitingForView } = views
  const customize = {
    model: peopleModel,
    config,
    onChange: setConfig,
    onReset: views.reset,
    canReset: !views.isDefaultLayout,
    onSaveAs: views.viewsUnavailable ? null : name => views.createView(name),
    noun: 'people',
  }

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
  const entriesFor = id => entries.filter(e => e.person_id === id)
  const askDelete = id => {
    const talks = entriesFor(id).length
    deletion.ask('people', id, 'person', {
      extra: talks ? ` Their ${talks === 1 ? 'conversation' : `${talks} conversations`} will be deleted too.` : '',
      then: () => { if (id === personId) openPerson(null) },
    })
  }

  const visibleColumns = config.columns.filter(c => c.visible).map(c => peopleModel.column(c.key))
  const shownPeople = useMemo(() => peopleModel.applyView(people, config), [people, config])
  const openedPerson = personId ? data.people.rows.find(p => p.id === personId) : null
  const personCompany = openedPerson ? data.companies.rows.find(c => sameCompany(c.company, openedPerson.company)) : null

  // A link to a person that doesn't exist (deleted, or someone else's) falls
  // back to the list once the data has loaded.
  useEffect(() => {
    if (personId && data.people.status === 'ready' && !openedPerson) navigate({ pathname: '/app/conversations', search }, { replace: true })
  }, [personId, openedPerson, data.people.status, navigate, search])

  function exportConversations() {
    const rows = []
    shownPeople.forEach(p => {
      const personEntries = entriesFor(p.id)
      const base = { name: p.name, company: p.company, email: p.email, phone: p.phone, other_contact: p.other_contact }
      if (personEntries.length === 0) rows.push({ ...base, date: '', recommendation: '', notes: '' })
      else personEntries.forEach(e => rows.push({ ...base, date: e.date || '', recommendation: e.recommendation || '', notes: e.notes || '' }))
    })
    downloadCSV('conversations.csv', toCSV(EXPORT_HEADERS, rows))
  }

  function renderCell(col, p) {
    switch (col.key) {
      case 'name': return <td key="name" className="sk-cell-company">{p.name || <span className="cell-placeholder">Unnamed</span>}</td>
      case 'last_contact': return <td key={col.key} className="sk-cell-meta">{p.last_contact ? formatShortDate(p.last_contact, undefined, profile.date_format) : dash}</td>
      case 'talks': return <td key={col.key} className="sk-cell-meta center">{p.talks}</td>
      default: return <td key={col.key} className="sk-cell-meta">{p[col.key] || dash}</td>
    }
  }

  return (
    <section aria-label="Conversations">
      <PageHeader
        title="Conversations"
        actions={<>
          <Button variant="ghost" icon="download" onClick={exportConversations}>Export</Button>
          <CustomizeMenu {...customize} />
          <Button variant="primary" icon="plus" onClick={addPerson}>Add person</Button>
        </>}
        mobileActions={
          <MobileActions
            primary={<Button variant="primary" icon="plus" onClick={addPerson}>Add person</Button>}
            customize={customize}
            items={[{ label: 'Export', onSelect: exportConversations }]}
          />
        }
      />

      <ViewsBar state={views} allLabel="All conversations" noun="conversations" />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              {visibleColumns.map(col => <SortHeader key={col.key} col={col} sort={config.sort} onSort={sort => setConfig({ sort })} className={col.type === 'number' ? 'center' : undefined} />)}
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {!waitingForView && shownPeople.map(p => (
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
                {visibleColumns.map(col => renderCell(col, p))}
                <td className="col-actions"><IconButton icon="x" size="sm" label="Delete person" onClick={() => askDelete(p.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!waitingForView && shownPeople.length > 0 && (
          <ul className="card-list" aria-label="People">
            {shownPeople.map(p => (
              <RecordCard
                key={p.id}
                label={`${p.name || 'Unnamed person'}${p.company ? `, ${p.company}` : ''}: open details`}
                selected={personId === p.id}
                onOpen={() => openPerson(p.id)}
                title={p.name || 'Unnamed'}
                aside={<span className="record-card-count">{p.talks === 1 ? '1 talk' : `${p.talks} talks`}</span>}
                body={p.company}
                meta={p.last_contact ? `Last contact ${formatShortDate(p.last_contact, undefined, profile.date_format)}` : 'No conversations yet'}
              />
            ))}
          </ul>
        )}
        <CollectionState state={waitingForView ? { status: 'loading', rows: [] } : data.people} onRetry={() => { reload('people'); reload('entries') }}>
          {shownPeople.length === 0 && (
            <div className="empty-state">
              {people.length === 0 ? 'No conversations logged yet. Add a person above.' : (
                <>Nothing matches this view's filters. <Button variant="link" onClick={() => setConfig({ filters: [] })}>Clear filters</Button></>
              )}
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
          onDeleteEntry={id => deletion.ask('entries', id, 'conversation')}
          onDelete={() => askDelete(openedPerson.id)}
          onClose={() => openPerson(null)}
        />
      )}
      {deletion.dialog}
    </section>
  )
}
