import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', cls: 'st-applied' },
  { value: 'screen', label: 'Phone screen', cls: 'st-screen' },
  { value: 'interview', label: 'Interviewing', cls: 'st-interview' },
  { value: 'offer', label: 'Offer', cls: 'st-offer' },
  { value: 'rejected', label: 'Rejected', cls: 'st-rejected' },
  { value: 'withdrawn', label: 'Withdrawn', cls: 'st-withdrawn' }
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', cls: 'pr-high' },
  { value: 'medium', label: 'Medium', cls: 'pr-medium' },
  { value: 'low', label: 'Low', cls: 'pr-low' }
]

const ALL_COLUMNS = [
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'position', label: 'Position', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'date_applied', label: 'Applied', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'salary', label: 'Salary', type: 'text' },
  { key: 'follow_up_date', label: 'Follow-up', type: 'date' },
  { key: 'interview_date', label: 'Interview', type: 'date' },
  { key: 'hiring_manager', label: 'Hiring mgr', type: 'text' },
  { key: 'connections', label: 'Connections', type: 'text' },
  { key: 'letter', label: 'Letter', type: 'icon' }
]
const DEFAULT_ORDER = ALL_COLUMNS.map(c => c.key)
const DEFAULT_HIDDEN = ['interview_date', 'hiring_manager', 'connections']

function optionClass(list, value, fallback) {
  const m = list.find(s => s.value === value)
  return m ? m.cls : fallback
}
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch (e) { return fallback }
}
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (e) { /* ignore */ }
}
function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}
function toCSV(headers, rows) {
  const lines = [headers.map(h => csvEscape(h.label)).join(',')]
  rows.forEach(r => { lines.push(headers.map(h => csvEscape(h.value ? h.value(r) : r[h.key])).join(',')) })
  return lines.join('\n')
}
function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
function formatDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function App() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [people, setPeople] = useState([])
  const [entries, setEntries] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyNotes, setCompanyNotes] = useState([])
  const [saving, setSaving] = useState('')

  const [columnOrder, setColumnOrder] = useState(() => loadLocal('jhl-col-order', DEFAULT_ORDER))
  const [hiddenCols, setHiddenCols] = useState(() => new Set(loadLocal('jhl-hidden-cols', DEFAULT_HIDDEN)))
  const [colFilters, setColFilters] = useState(() => loadLocal('jhl-col-filters', {}))
  const [peopleFilters, setPeopleFilters] = useState({})
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const [openFilterPeopleCol, setOpenFilterPeopleCol] = useState(null)
  const [manageColsOpen, setManageColsOpen] = useState(false)

  const [editingAppId, setEditingAppId] = useState(null)
  const [contactPersonId, setContactPersonId] = useState(null)
  const [notesCompanyId, setNotesCompanyId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)

  const dragColIdxRef = useRef(null)

  useEffect(() => { loadApplications(); loadPeople(); loadEntries(); loadCompanies(); loadCompanyNotes() }, [])
  useEffect(() => { saveLocal('jhl-col-order', columnOrder) }, [columnOrder])
  useEffect(() => { saveLocal('jhl-hidden-cols', [...hiddenCols]) }, [hiddenCols])
  useEffect(() => { saveLocal('jhl-col-filters', colFilters) }, [colFilters])

  useEffect(() => {
    function onClickOutside(e) {
      if (!e.target.closest('.popover') && !e.target.closest('.popover-wrap')) {
        setOpenFilterCol(null)
        setOpenFilterPeopleCol(null)
        setManageColsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function loadApplications() {
    const { data } = await supabase.from('applications').select('*').order('date_applied', { ascending: false, nullsFirst: false })
    setApplications(data || [])
  }
  async function loadPeople() {
    const { data } = await supabase.from('people').select('*').order('name')
    setPeople(data || [])
  }
  async function loadEntries() {
    const { data } = await supabase.from('conversation_entries').select('*').order('date', { ascending: false, nullsFirst: false })
    setEntries(data || [])
  }
  async function loadCompanies() {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    setCompanies(data || [])
  }
  async function loadCompanyNotes() {
    const { data } = await supabase.from('company_notes').select('*').order('created_at', { ascending: false })
    setCompanyNotes(data || [])
  }

  const flagSaving = useCallback(() => {
    setSaving('Saving…')
    setTimeout(() => setSaving('Saved'), 400)
  }, [])

  async function addApplication() {
    const { data, error } = await supabase.from('applications').insert({
      company: '', position: '', location: '', status: 'applied', priority: 'medium'
    }).select().single()
    if (!error && data) {
      setApplications(prev => [data, ...prev])
      setEditingAppId(data.id)
    }
  }
  async function updateApplication(id, field, value) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
    flagSaving()
    await supabase.from('applications').update({ [field]: value }).eq('id', id)
  }
  async function deleteApplication(id) {
    setApplications(prev => prev.filter(a => a.id !== id))
    await supabase.from('applications').delete().eq('id', id)
  }

  async function addPerson() {
    const { data, error } = await supabase.from('people').insert({ name: '', company: '', email: '', phone: '', other_contact: '' }).select().single()
    if (!error && data) {
      setPeople(prev => [data, ...prev])
      setContactPersonId(data.id)
    }
  }
  async function updatePerson(id, field, value) {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    flagSaving()
    await supabase.from('people').update({ [field]: value }).eq('id', id)
  }
  async function deletePerson(id) {
    setPeople(prev => prev.filter(p => p.id !== id))
    setEntries(prev => prev.filter(e => e.person_id !== id))
    await supabase.from('people').delete().eq('id', id)
  }
  async function addEntry(personId, { date, recommendation, notes }) {
    const { data, error } = await supabase.from('conversation_entries').insert({ person_id: personId, date, recommendation, notes }).select().single()
    if (!error && data) setEntries(prev => [data, ...prev])
  }

  async function addCompany() {
    const { data, error } = await supabase.from('companies').insert({ company: '', careers_link: '' }).select().single()
    if (!error && data) setCompanies(prev => [data, ...prev])
  }
  async function updateCompany(id, field, value) {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
    flagSaving()
    await supabase.from('companies').update({ [field]: value }).eq('id', id)
  }
  async function deleteCompany(id) {
    setCompanies(prev => prev.filter(c => c.id !== id))
    setCompanyNotes(prev => prev.filter(n => n.company_id !== id))
    await supabase.from('companies').delete().eq('id', id)
  }
  async function addCompanyNote(companyId, note) {
    const { data, error } = await supabase.from('company_notes').insert({ company_id: companyId, note }).select().single()
    if (!error && data) setCompanyNotes(prev => [data, ...prev])
  }
  function appliedCountFor(companyName) {
    const target = (companyName || '').trim().toLowerCase()
    if (!target) return 0
    return applications.filter(a => (a.company || '').trim().toLowerCase() === target).length
  }
  async function trackCareersClick(id) {
    const now = new Date().toISOString()
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, last_clicked: now } : c))
    await supabase.from('companies').update({ last_clicked: now }).eq('id', id)
  }
  function formatClicked(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }

  function requestDelete(type, id) { setConfirmTarget({ type, id }) }
  function confirmDeleteAction() {
    if (!confirmTarget) return
    if (confirmTarget.type === 'application') deleteApplication(confirmTarget.id)
    if (confirmTarget.type === 'person') deletePerson(confirmTarget.id)
    if (confirmTarget.type === 'company') deleteCompany(confirmTarget.id)
    setConfirmTarget(null)
  }

  function hideColumn(key) { setHiddenCols(prev => new Set(prev).add(key)) }
  function showColumn(key) { setHiddenCols(prev => { const next = new Set(prev); next.delete(key); return next }) }
  function reorderColumns(fromIdx, toIdx) {
    setColumnOrder(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
  }
  function setTextFilter(key, value) { setColFilters(prev => ({ ...prev, [key]: value })) }
  function toggleSelectFilter(key, value, options) {
    setColFilters(prev => {
      const current = prev[key] ? [...prev[key]] : options.map(o => o.value)
      const idx = current.indexOf(value)
      if (idx >= 0) current.splice(idx, 1); else current.push(value)
      return { ...prev, [key]: current }
    })
  }
  function hasActiveFilter(col) {
    if (col.type === 'text') return !!(colFilters[col.key] && colFilters[col.key].trim())
    if (col.type === 'select') return !!(colFilters[col.key] && colFilters[col.key].length < col.options.length)
    return false
  }

  const visibleColumns = columnOrder.filter(k => !hiddenCols.has(k)).map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)

  function passesFilters(a) {
    for (const col of ALL_COLUMNS) {
      if (col.type === 'text') {
        const f = (colFilters[col.key] || '').trim().toLowerCase()
        if (f && !(a[col.key] || '').toString().toLowerCase().includes(f)) return false
      } else if (col.type === 'select') {
        const allowed = colFilters[col.key]
        if (allowed && allowed.length < col.options.length) {
          const val = a[col.key] || col.options[0].value
          if (!allowed.includes(val)) return false
        }
      }
    }
    return true
  }
  function passesPeopleFilters(p) {
    const nameF = (peopleFilters.name || '').trim().toLowerCase()
    const companyF = (peopleFilters.company || '').trim().toLowerCase()
    if (nameF && !(p.name || '').toLowerCase().includes(nameF)) return false
    if (companyF && !(p.company || '').toLowerCase().includes(companyF)) return false
    return true
  }

  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  const active = applications.length - counts.rejected - counts.withdrawn
  const filteredApplications = applications.filter(passesFilters)
  const filteredPeople = people.filter(passesPeopleFilters)

  function entriesFor(personId) {
    return entries.filter(e => e.person_id === personId)
  }
  function lastContactFor(personId) {
    const list = entriesFor(personId).map(e => e.date).filter(Boolean).sort()
    return list.length ? list[list.length - 1] : null
  }
  function notesFor(companyId) {
    return companyNotes.filter(n => n.company_id === companyId)
  }

  function exportApplications() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'position', label: 'Position' },
      { key: 'link', label: 'Application Link' }, { key: 'cover_letter_link', label: 'Cover Letter Link' },
      { key: 'location', label: 'Location' }, { key: 'date_applied', label: 'Date Applied' },
      { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' },
      { key: 'source', label: 'Source' }, { key: 'salary', label: 'Salary' },
      { key: 'hiring_manager', label: 'Hiring Manager' }, { key: 'connections', label: 'Other Connections' },
      { key: 'next_action', label: 'Next Action' }, { key: 'follow_up_date', label: 'Follow-up Date' },
      { key: 'interview_date', label: 'Interview Date' }, { key: 'notes', label: 'Notes' }
    ]
    downloadCSV('applications.csv', toCSV(headers, filteredApplications))
  }
  function exportConversations() {
    const rows = []
    filteredPeople.forEach(p => {
      const personEntries = entriesFor(p.id)
      if (personEntries.length === 0) {
        rows.push({ name: p.name, company: p.company, email: p.email, phone: p.phone, other_contact: p.other_contact, date: '', recommendation: '', notes: '' })
      } else {
        personEntries.forEach(e => {
          rows.push({ name: p.name, company: p.company, email: p.email, phone: p.phone, other_contact: p.other_contact, date: e.date || '', recommendation: e.recommendation || '', notes: e.notes || '' })
        })
      }
    })
    const headers = [
      { key: 'name', label: 'Person' }, { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'other_contact', label: 'Other Contact' },
      { key: 'date', label: 'Conversation Date' }, { key: 'recommendation', label: 'Recommendation' }, { key: 'notes', label: 'Notes' }
    ]
    downloadCSV('conversations.csv', toCSV(headers, rows))
  }
  function exportCompanies() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'careers_link', label: 'Careers Link' },
      { key: 'applied_count', label: 'Applied Count', value: r => appliedCountFor(r.company) },
      { key: 'last_clicked', label: 'Last Clicked', value: r => r.last_clicked || '' },
      { key: 'notes', label: 'Notes', value: r => notesFor(r.id).slice().reverse().map(n => `${formatDateTime(n.created_at)}: ${n.note}`).join(' | ') }
    ]
    downloadCSV('companies.csv', toCSV(headers, companies))
  }

  const editingApp = editingAppId ? applications.find(a => a.id === editingAppId) : null
  const contactPerson = contactPersonId ? people.find(p => p.id === contactPersonId) : null
  const notesCompany = notesCompanyId ? companies.find(c => c.id === notesCompanyId) : null

  return (
    <div className="wrap">
      <h2 className="sr-only">Job hunt tracker with an applications ledger, a networking conversation log, and a companies watchlist.</h2>

      <header>
        <h1>Job Hunt Log<span>Applications &amp; networking, operations style</span></h1>
        <div className="tally">
          <TallyItem num={applications.length} label="Applied" />
          <TallyItem num={counts.screen + counts.interview} label="In process" />
          <TallyItem num={counts.offer} label="Offers" />
          <TallyItem num={active} label="Active" />
        </div>
      </header>

      <div className="tabs">
        <button className={'tab' + (tab === 'applications' ? ' active' : '')} onClick={() => setTab('applications')}>Applications</button>
        <button className={'tab' + (tab === 'conversations' ? ' active' : '')} onClick={() => setTab('conversations')}>Conversations</button>
        <button className={'tab' + (tab === 'companies' ? ' active' : '')} onClick={() => setTab('companies')}>Companies</button>
      </div>

      {tab === 'applications' && (
        <div className="panel">
          <div className="panel-head">
            <p>Click the ⤢ icon to open every field. Click a column name to filter it.</p>
            <div className="panel-head-btns">
              <div className="popover-wrap">
                <button className="add-btn secondary" onClick={() => setManageColsOpen(!manageColsOpen)}>Columns</button>
                {manageColsOpen && (
                  <div className="popover manage-cols-popover">
                    {columnOrder.map((key, idx) => {
                      const col = ALL_COLUMNS.find(c => c.key === key)
                      if (!col) return null
                      return (
                        <div
                          key={key}
                          className="manage-col-row"
                          draggable
                          onDragStart={() => { dragColIdxRef.current = idx }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            const from = dragColIdxRef.current
                            if (from === null || from === idx) return
                            reorderColumns(from, idx)
                            dragColIdxRef.current = null
                          }}
                        >
                          <span className="drag-handle">⋮⋮</span>
                          <label className="popover-row" style={{ flex: 1 }}>
                            <input type="checkbox" checked={!hiddenCols.has(key)} onChange={() => hiddenCols.has(key) ? showColumn(key) : hideColumn(key)} />
                            {col.label}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <button className="add-btn secondary" onClick={exportApplications}>Export CSV</button>
              <button className="add-btn" onClick={addApplication}>+ Add application</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  {visibleColumns.map(col => (
                    <th key={col.key}>
                      {(col.type === 'text' || col.type === 'select') ? (
                        <div className="popover-wrap">
                          <button className={'col-label-btn' + (hasActiveFilter(col) ? ' active-filter' : '')} onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)}>
                            {col.label}{hasActiveFilter(col) && <span className="filter-dot" />}
                          </button>
                          {openFilterCol === col.key && (
                            <div className="popover">
                              {col.type === 'text' && (
                                <input autoFocus className="col-filter" placeholder="filter…" value={colFilters[col.key] || ''} onChange={e => setTextFilter(col.key, e.target.value)} />
                              )}
                              {col.type === 'select' && col.options.map(o => (
                                <label key={o.value} className="popover-row">
                                  <input type="checkbox" checked={!colFilters[col.key] || colFilters[col.key].includes(o.value)} onChange={() => toggleSelectFilter(col.key, o.value, col.options)} />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="col-label-plain">{col.label}</span>
                      )}
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(a => (
                  <tr key={a.id} className="app-row">
                    <td className="expand-cell" onClick={() => setEditingAppId(a.id)} title="Open full details">
                      <span className="expand-icon">⤢</span>
                    </td>
                    {visibleColumns.map(col => renderAppCell(col, a, (field, value) => updateApplication(a.id, field, value)))}
                    <td><button className="del-btn" title="Delete row" onClick={() => requestDelete('application', a.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredApplications.length === 0 && (
            <div className="empty-state">
              {applications.length === 0 ? 'No applications logged yet. Add your first one above.' : 'Nothing matches the current filters.'}
            </div>
          )}
        </div>
      )}

      {tab === 'conversations' && (
        <div className="panel">
          <div className="panel-head">
            <p>Click a person's name to see contact info and every conversation you've logged with them.</p>
            <div className="panel-head-btns">
              <button className="add-btn secondary" onClick={exportConversations}>Export CSV</button>
              <button className="add-btn" onClick={addPerson}>+ Add person</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 170 }}>
                    <div className="popover-wrap">
                      <button className={'col-label-btn' + ((peopleFilters.name || '').trim() ? ' active-filter' : '')} onClick={() => setOpenFilterPeopleCol(openFilterPeopleCol === 'name' ? null : 'name')}>
                        Person{(peopleFilters.name || '').trim() && <span className="filter-dot" />}
                      </button>
                      {openFilterPeopleCol === 'name' && (
                        <div className="popover">
                          <input autoFocus className="col-filter" placeholder="filter…" value={peopleFilters.name || ''} onChange={e => setPeopleFilters(prev => ({ ...prev, name: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  </th>
                  <th style={{ width: 170 }}>
                    <div className="popover-wrap">
                      <button className={'col-label-btn' + ((peopleFilters.company || '').trim() ? ' active-filter' : '')} onClick={() => setOpenFilterPeopleCol(openFilterPeopleCol === 'company' ? null : 'company')}>
                        Company{(peopleFilters.company || '').trim() && <span className="filter-dot" />}
                      </button>
                      {openFilterPeopleCol === 'company' && (
                        <div className="popover">
                          <input autoFocus className="col-filter" placeholder="filter…" value={peopleFilters.company || ''} onChange={e => setPeopleFilters(prev => ({ ...prev, company: e.target.value }))} />
                        </div>
                      )}
                    </div>
                  </th>
                  <th style={{ width: 110 }}>Last contact</th>
                  <th style={{ width: 90 }}>Talks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map(p => {
                  const count = entriesFor(p.id).length
                  const last = lastContactFor(p.id)
                  return (
                    <tr key={p.id} className="app-row">
                      <PersonCell value={p.name} onSave={v => updatePerson(p.id, 'name', v)} onOpenModal={() => setContactPersonId(p.id)} />
                      <EditableCell value={p.company} placeholder="Company" onSave={v => updatePerson(p.id, 'company', v)} />
                      <td className="num-col">{last ? last : '—'}</td>
                      <td className="num-col" style={{ textAlign: 'center' }}>{count}</td>
                      <td><button className="del-btn" title="Delete person" onClick={() => requestDelete('person', p.id)}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredPeople.length === 0 && (
            <div className="empty-state">
              {people.length === 0 ? 'No conversations logged yet. Add a person above.' : 'Nothing matches the current filters.'}
            </div>
          )}
        </div>
      )}

      {tab === 'companies' && (
        <div className="panel">
          <div className="panel-head">
            <p>Places you're watching, researching, or were pointed toward.</p>
            <div className="panel-head-btns">
              <button className="add-btn secondary" onClick={exportCompanies}>Export CSV</button>
              <button className="add-btn" onClick={addCompany}>+ Add company</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Company</th>
                  <th style={{ width: 220 }}>Careers link</th>
                  <th style={{ width: 60 }}>Applied</th>
                  <th style={{ width: 120 }}>Last clicked</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => {
                  const noteCount = notesFor(c.id).length
                  return (
                    <tr key={c.id}>
                      <EditableCell value={c.company} placeholder="Company" onSave={v => updateCompany(c.id, 'company', v)} />
                      <td className="link-cell">
                        <div className="link-with-open">
                          <input type="url" placeholder="paste careers page link" defaultValue={c.careers_link || ''} onBlur={e => updateCompany(c.id, 'careers_link', e.target.value)} />
                          {c.careers_link && (
                            <a href={c.careers_link} target="_blank" rel="noopener noreferrer" title="Open careers page" onClick={() => trackCareersClick(c.id)}><i className="ti ti-external-link" /></a>
                          )}
                        </div>
                      </td>
                      <td className="num-col" style={{ textAlign: 'center' }}>{appliedCountFor(c.company)}</td>
                      <td className="num-col">{formatClicked(c.last_clicked)}</td>
                      <td>
                        <button className="notes-btn" onClick={() => setNotesCompanyId(c.id)}>
                          <i className="ti ti-notes" /> {noteCount > 0 ? `${noteCount} note${noteCount > 1 ? 's' : ''}` : 'Add note'}
                        </button>
                      </td>
                      <td><button className="del-btn" title="Delete row" onClick={() => requestDelete('company', c.id)}>×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {companies.length === 0 && <div className="empty-state">No companies logged yet. Add one above.</div>}
        </div>
      )}

      <footer className="saved-tag">{saving}</footer>

      {editingApp && (
        <ApplicationModal app={editingApp} onUpdate={(field, value) => updateApplication(editingApp.id, field, value)} onClose={() => setEditingAppId(null)} />
      )}
      {contactPerson && (
        <ContactModal
          person={contactPerson}
          entries={entriesFor(contactPerson.id)}
          onUpdate={(field, value) => updatePerson(contactPerson.id, field, value)}
          onAddEntry={data => addEntry(contactPerson.id, data)}
          onClose={() => setContactPersonId(null)}
        />
      )}
      {notesCompany && (
        <CompanyNotesModal
          company={notesCompany}
          notes={notesFor(notesCompany.id)}
          onAddNote={note => addCompanyNote(notesCompany.id, note)}
          onClose={() => setNotesCompanyId(null)}
        />
      )}
      {confirmTarget && (
        <ConfirmDialog message="Are you sure you want to delete this? This can't be undone." onConfirm={confirmDeleteAction} onCancel={() => setConfirmTarget(null)} />
      )}
    </div>
  )
}

function renderAppCell(col, a, onUpdate) {
  switch (col.key) {
    case 'company':
      return <EditableCell key="company" value={a.company} placeholder="Company" onSave={v => onUpdate('company', v)} />
    case 'position':
      return <PositionCell key="position" value={a.position} link={a.link} onSave={v => onUpdate('position', v)} />
    case 'location': case 'source': case 'salary': case 'hiring_manager': case 'connections':
      return <EditableCell key={col.key} value={a[col.key]} placeholder="—" onSave={v => onUpdate(col.key, v)} />
    case 'date_applied': case 'follow_up_date': case 'interview_date':
      return (
        <td key={col.key} className="num-col">
          <input type="date" value={a[col.key] || ''} onChange={e => onUpdate(col.key, e.target.value)} />
        </td>
      )
    case 'status':
      return (
        <td key="status">
          <select className={'status-select ' + optionClass(STATUS_OPTIONS, a.status, 'st-applied')} value={a.status || 'applied'} onChange={e => onUpdate('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </td>
      )
    case 'priority':
      return (
        <td key="priority">
          <select className={'priority-select ' + optionClass(PRIORITY_OPTIONS, a.priority, 'pr-medium')} value={a.priority || 'medium'} onChange={e => onUpdate('priority', e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </td>
      )
    case 'letter':
      return (
        <td key="letter" style={{ textAlign: 'center' }}>
          {a.cover_letter_link
            ? <a className="letter-link" href={a.cover_letter_link} target="_blank" rel="noopener noreferrer" title="Open cover letter" onClick={e => e.stopPropagation()}><i className="ti ti-file-text" /></a>
            : <span className="letter-link-empty">—</span>}
        </td>
      )
    default:
      return <td key={col.key}></td>
  }
}

function ApplicationModal({ app, onUpdate, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <input className="modal-title-input" type="text" defaultValue={app.company} placeholder="Company" onBlur={e => onUpdate('company', e.target.value)} />
            <input className="modal-subtitle-input" type="text" defaultValue={app.position} placeholder="Position" onBlur={e => onUpdate('position', e.target.value)} />
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="detail-grid modal-grid">
          <label>Location<input type="text" defaultValue={app.location || ''} onBlur={e => onUpdate('location', e.target.value)} /></label>
          <label>Status
            <select value={app.status || 'applied'} onChange={e => onUpdate('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={app.priority || 'medium'} onChange={e => onUpdate('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label>Date applied<input type="date" value={app.date_applied || ''} onChange={e => onUpdate('date_applied', e.target.value)} /></label>
          <label>Application link<input type="url" placeholder="paste the link to where you applied" defaultValue={app.link || ''} onBlur={e => onUpdate('link', e.target.value)} /></label>
          <label>Cover letter link<input type="url" placeholder="paste Google Doc link" defaultValue={app.cover_letter_link || ''} onBlur={e => onUpdate('cover_letter_link', e.target.value)} /></label>
          <label>Source<input type="text" placeholder="referral, LinkedIn, cold, etc." defaultValue={app.source || ''} onBlur={e => onUpdate('source', e.target.value)} /></label>
          <label>Salary / comp<input type="text" placeholder="e.g. $70k–85k or n/a" defaultValue={app.salary || ''} onBlur={e => onUpdate('salary', e.target.value)} /></label>
          <label>Hiring manager<input type="text" defaultValue={app.hiring_manager || ''} onBlur={e => onUpdate('hiring_manager', e.target.value)} /></label>
          <label>Other connections<input type="text" defaultValue={app.connections || ''} onBlur={e => onUpdate('connections', e.target.value)} /></label>
          <label>Next action<input type="text" placeholder="e.g. follow up with recruiter" defaultValue={app.next_action || ''} onBlur={e => onUpdate('next_action', e.target.value)} /></label>
          <label>Follow-up date<input type="date" value={app.follow_up_date || ''} onChange={e => onUpdate('follow_up_date', e.target.value)} /></label>
          <label>Interview date<input type="date" value={app.interview_date || ''} onChange={e => onUpdate('interview_date', e.target.value)} /></label>
          <label className="notes-field">Notes<textarea className="conv-note" placeholder="interview prep, red flags, anything else" defaultValue={app.notes || ''} onBlur={e => onUpdate('notes', e.target.value)} /></label>
        </div>
      </div>
    </div>
  )
}

function ContactModal({ person, entries, onUpdate, onAddEntry, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [recommendation, setRecommendation] = useState('')
  const [notes, setNotes] = useState('')

  function submitEntry() {
    if (!recommendation.trim() && !notes.trim()) return
    onAddEntry({ date, recommendation, notes })
    setRecommendation('')
    setNotes('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <input className="modal-title-input" type="text" defaultValue={person.name} placeholder="Name" onBlur={e => onUpdate('name', e.target.value)} />
            <input className="modal-subtitle-input" type="text" defaultValue={person.company} placeholder="Company" onBlur={e => onUpdate('company', e.target.value)} />
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="detail-grid modal-grid" style={{ paddingBottom: 10 }}>
          <label>Email<input type="text" placeholder="name@company.com" defaultValue={person.email || ''} onBlur={e => onUpdate('email', e.target.value)} /></label>
          <label>Phone<input type="text" placeholder="phone number" defaultValue={person.phone || ''} onBlur={e => onUpdate('phone', e.target.value)} /></label>
          <label>Other contact<input type="text" placeholder="LinkedIn, etc." defaultValue={person.other_contact || ''} onBlur={e => onUpdate('other_contact', e.target.value)} /></label>
        </div>

        <div className="thread-section">
          <div className="thread-add">
            <div className="thread-add-row">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <button className="add-btn" onClick={submitEntry}>+ Log conversation</button>
            </div>
            <textarea className="conv-note" placeholder="What they recommended…" value={recommendation} onChange={e => setRecommendation(e.target.value)} />
            <textarea className="conv-note" placeholder="Anything else worth remembering…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="thread-list">
            {entries.length === 0 && <p className="thread-empty">No conversations logged yet.</p>}
            {entries.map(e => (
              <div key={e.id} className="thread-entry">
                <div className="thread-entry-date">{e.date || 'No date'}</div>
                {e.recommendation && <div className="thread-entry-text"><strong>Recommended:</strong> {e.recommendation}</div>}
                {e.notes && <div className="thread-entry-text">{e.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyNotesModal({ company, notes, onAddNote, onClose }) {
  const [draft, setDraft] = useState('')

  function submit() {
    if (!draft.trim()) return
    onAddNote(draft)
    setDraft('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-title-static">{company.company || 'Company'}</span>
            <span className="modal-subtitle-static">Notes</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="thread-section" style={{ paddingTop: 18 }}>
          <div className="thread-add">
            <textarea className="conv-note" placeholder="Add a note…" value={draft} onChange={e => setDraft(e.target.value)} />
            <button className="add-btn" onClick={submit}>+ Add note</button>
          </div>
          <div className="thread-list">
            {notes.length === 0 && <p className="thread-empty">No notes yet.</p>}
            {notes.map(n => (
              <div key={n.id} className="thread-entry">
                <div className="thread-entry-date">{formatDateTime(n.created_at)}</div>
                <div className="thread-entry-text">{n.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="add-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="add-btn danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function TallyItem({ num, label }) {
  return (
    <div className="tally-item">
      <span className="tally-num">{num}</span>
      <span className="tally-label">{label}</span>
    </div>
  )
}

function EditableCell({ value, placeholder, onSave }) {
  return (
    <td contentEditable suppressContentEditableWarning data-placeholder={placeholder} onBlur={e => onSave(e.target.textContent)}>
      {value || ''}
    </td>
  )
}

function PositionCell({ value, link, onSave }) {
  const [editing, setEditing] = useState(false)
  if (!link) return <EditableCell value={value} placeholder="Position" onSave={onSave} />
  if (editing) {
    return (
      <td contentEditable suppressContentEditableWarning autoFocus onBlur={e => { onSave(e.target.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td>
      <a className="position-link" href={link} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => { e.preventDefault(); setEditing(true) }}
        title="Opens where you applied — double-click to rename">
        {value || 'Position'}
      </a>
    </td>
  )
}

function PersonCell({ value, onSave, onOpenModal }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td contentEditable suppressContentEditableWarning autoFocus onBlur={e => { onSave(e.target.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td className="person-cell">
      <span className="position-link" onClick={onOpenModal}>{value || 'Name'}</span>
      <button className="edit-pencil" onClick={e => { e.stopPropagation(); setEditing(true) }} title="Rename">✎</button>
    </td>
  )
}
