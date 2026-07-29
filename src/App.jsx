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
  rows.forEach(r => {
    lines.push(headers.map(h => csvEscape(h.value ? h.value(r) : r[h.key])).join(','))
  })
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

export default function App() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [conversations, setConversations] = useState([])
  const [companies, setCompanies] = useState([])
  const [expandedApps, setExpandedApps] = useState(new Set())
  const [expandedConvos, setExpandedConvos] = useState(new Set())
  const [saving, setSaving] = useState('')

  const [columnOrder, setColumnOrder] = useState(() => loadLocal('jhl-col-order', DEFAULT_ORDER))
  const [hiddenCols, setHiddenCols] = useState(() => new Set(loadLocal('jhl-hidden-cols', DEFAULT_HIDDEN)))
  const [colFilters, setColFilters] = useState(() => loadLocal('jhl-col-filters', {}))
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const [addColOpen, setAddColOpen] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => { loadApplications(); loadConversations(); loadCompanies() }, [])
  useEffect(() => { saveLocal('jhl-col-order', columnOrder) }, [columnOrder])
  useEffect(() => { saveLocal('jhl-hidden-cols', [...hiddenCols]) }, [hiddenCols])
  useEffect(() => { saveLocal('jhl-col-filters', colFilters) }, [colFilters])

  useEffect(() => {
    function onClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenFilterCol(null)
        setAddColOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function loadApplications() {
    const { data } = await supabase.from('applications').select('*').order('date_applied', { ascending: false, nullsFirst: false })
    setApplications(data || [])
  }
  async function loadConversations() {
    const { data } = await supabase.from('conversations').select('*').order('date', { ascending: false, nullsFirst: false })
    setConversations(data || [])
  }
  async function loadCompanies() {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    setCompanies(data || [])
  }

  const flagSaving = useCallback(() => {
    setSaving('Saving…')
    setTimeout(() => setSaving('Saved'), 400)
  }, [])

  function toggleSet(setState, id) {
    setState(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function addApplication() {
    const { data, error } = await supabase.from('applications').insert({
      company: '', position: '', location: '', status: 'applied', priority: 'medium'
    }).select().single()
    if (!error && data) {
      setApplications(prev => [data, ...prev])
      setExpandedApps(prev => new Set(prev).add(data.id))
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

  async function addConversation() {
    const { data, error } = await supabase.from('conversations').insert({
      person: '', context: '', recommendation: '', notes: '', email: '', phone: '', other_contact: ''
    }).select().single()
    if (!error && data) {
      setConversations(prev => [data, ...prev])
      setExpandedConvos(prev => new Set(prev).add(data.id))
    }
  }
  async function updateConversation(id, field, value) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
    flagSaving()
    await supabase.from('conversations').update({ [field]: value }).eq('id', id)
  }
  async function deleteConversation(id) {
    setConversations(prev => prev.filter(c => c.id !== id))
    await supabase.from('conversations').delete().eq('id', id)
  }

  async function addCompany() {
    const { data, error } = await supabase.from('companies').insert({ company: '', careers_link: '', notes: '' }).select().single()
    if (!error && data) setCompanies(prev => [data, ...prev])
  }
  async function updateCompany(id, field, value) {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
    flagSaving()
    await supabase.from('companies').update({ [field]: value }).eq('id', id)
  }
  async function deleteCompany(id) {
    setCompanies(prev => prev.filter(c => c.id !== id))
    await supabase.from('companies').delete().eq('id', id)
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

  // --- column drag/reorder/hide/filter ---
  const draggedKeyRef = useRef(null)
  function onColDragStart(key) { draggedKeyRef.current = key }
  function onColDragOver(e) { e.preventDefault() }
  function onColDrop(targetKey) {
    const dragged = draggedKeyRef.current
    if (!dragged || dragged === targetKey) return
    setColumnOrder(prev => {
      const arr = prev.filter(k => k !== dragged)
      const idx = arr.indexOf(targetKey)
      arr.splice(idx, 0, dragged)
      return arr
    })
  }
  function hideColumn(key) {
    setHiddenCols(prev => new Set(prev).add(key))
  }
  function showColumn(key) {
    setHiddenCols(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }
  function setTextFilter(key, value) {
    setColFilters(prev => ({ ...prev, [key]: value }))
  }
  function toggleSelectFilter(key, value, options) {
    setColFilters(prev => {
      const current = prev[key] ? [...prev[key]] : options.map(o => o.value)
      const idx = current.indexOf(value)
      if (idx >= 0) current.splice(idx, 1); else current.push(value)
      return { ...prev, [key]: current }
    })
  }

  const visibleColumns = columnOrder.filter(k => !hiddenCols.has(k)).map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)
  const hiddenColumnDefs = [...hiddenCols].map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)

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

  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  const active = applications.length - counts.rejected - counts.withdrawn
  const filteredApplications = applications.filter(passesFilters)

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
    const headers = [
      { key: 'date', label: 'Date' }, { key: 'person', label: 'Person' }, { key: 'context', label: 'Company/Context' },
      { key: 'recommendation', label: 'Recommendation' }, { key: 'notes', label: 'Notes' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'other_contact', label: 'Other Contact' }
    ]
    downloadCSV('conversations.csv', toCSV(headers, conversations))
  }
  function exportCompanies() {
    const headers = [
      { key: 'company', label: 'Company' }, { key: 'careers_link', label: 'Careers Link' },
      { key: 'applied_count', label: 'Applied Count', value: r => appliedCountFor(r.company) },
      { key: 'last_clicked', label: 'Last Clicked', value: r => r.last_clicked || '' },
      { key: 'notes', label: 'Notes' }
    ]
    downloadCSV('companies.csv', toCSV(headers, companies))
  }

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
            <p>Drag a column header to reorder it, use × to hide it, filter right in the header. Click the position to open where you applied.</p>
            <div className="panel-head-btns">
              <button className="add-btn secondary" onClick={exportApplications}>Export CSV</button>
              <button className="add-btn" onClick={addApplication}>+ Add application</button>
            </div>
          </div>

          <div className="table-wrap" ref={popoverRef}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  {visibleColumns.map(col => (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={() => onColDragStart(col.key)}
                      onDragOver={onColDragOver}
                      onDrop={() => onColDrop(col.key)}
                    >
                      <div className="col-head">
                        <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                        <span className="col-label">{col.label}</span>
                        <button className="col-hide-btn" onClick={() => hideColumn(col.key)} title="Hide column">×</button>
                      </div>
                      {col.type === 'text' && (
                        <input
                          className="col-filter"
                          placeholder="filter…"
                          value={colFilters[col.key] || ''}
                          onChange={e => setTextFilter(col.key, e.target.value)}
                        />
                      )}
                      {col.type === 'select' && (
                        <div className="popover-wrap">
                          <button className="col-filter-btn" onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)}>
                            Filter{colFilters[col.key] && colFilters[col.key].length < col.options.length ? ` (${colFilters[col.key].length})` : ''}
                          </button>
                          {openFilterCol === col.key && (
                            <div className="popover">
                              {col.options.map(o => (
                                <label key={o.value} className="popover-row">
                                  <input
                                    type="checkbox"
                                    checked={!colFilters[col.key] || colFilters[col.key].includes(o.value)}
                                    onChange={() => toggleSelectFilter(col.key, o.value, col.options)}
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                  {hiddenColumnDefs.length > 0 && (
                    <th style={{ width: 40 }}>
                      <div className="popover-wrap">
                        <button className="col-filter-btn" onClick={() => setAddColOpen(!addColOpen)} title="Show a hidden column">+</button>
                        {addColOpen && (
                          <div className="popover">
                            {hiddenColumnDefs.map(c => (
                              <label key={c.key} className="popover-row" onClick={() => showColumn(c.key)}>
                                + {c.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(a => (
                  <ApplicationRow
                    key={a.id}
                    app={a}
                    columns={visibleColumns}
                    extraTd={hiddenColumnDefs.length > 0}
                    isOpen={expandedApps.has(a.id)}
                    onToggle={() => toggleSet(setExpandedApps, a.id)}
                    onUpdate={(field, value) => updateApplication(a.id, field, value)}
                    onDelete={() => deleteApplication(a.id)}
                  />
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
            <p>Click a person's name to see and edit their contact info.</p>
            <div className="panel-head-btns">
              <button className="add-btn secondary" onClick={exportConversations}>Export CSV</button>
              <button className="add-btn" onClick={addConversation}>+ Add conversation</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 150 }}>Person</th>
                  <th style={{ width: 150 }}>Company / context</th>
                  <th style={{ width: 260 }}>What they recommended</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {conversations.map(c => (
                  <ConversationRow
                    key={c.id}
                    convo={c}
                    isOpen={expandedConvos.has(c.id)}
                    onToggle={() => toggleSet(setExpandedConvos, c.id)}
                    onUpdate={(field, value) => updateConversation(c.id, field, value)}
                    onDelete={() => deleteConversation(c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {conversations.length === 0 && <div className="empty-state">No conversations logged yet. Add one above.</div>}
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
                {companies.map(c => (
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
                      <textarea className="conv-note" placeholder="why you're interested, who mentioned it, anything else" defaultValue={c.notes || ''} onBlur={e => updateCompany(c.id, 'notes', e.target.value)} />
                    </td>
                    <td><button className="del-btn" title="Delete row" onClick={() => deleteCompany(c.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {companies.length === 0 && <div className="empty-state">No companies logged yet. Add one above.</div>}
        </div>
      )}

      <footer className="saved-tag">{saving}</footer>
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

function ApplicationRow({ app: a, columns, extraTd, isOpen, onToggle, onUpdate, onDelete }) {
  const colSpan = 2 + columns.length + (extraTd ? 1 : 0)
  return (
    <>
      <tr className="app-row">
        <td className="expand-cell" onClick={onToggle}>
          <span className={'chevron' + (isOpen ? ' open' : '')}>›</span>
        </td>
        {columns.map(col => renderAppCell(col, a, onUpdate))}
        {extraTd && <td></td>}
        <td><button className="del-btn" title="Delete row" onClick={onDelete}>×</button></td>
      </tr>
      {isOpen && (
        <tr className="detail-row">
          <td colSpan={colSpan}>
            <div className="detail-grid">
              <label>Application link<input type="url" placeholder="paste the link to where you applied" defaultValue={a.link || ''} onBlur={e => onUpdate('link', e.target.value)} /></label>
              <label>Cover letter link<input type="url" placeholder="paste Google Doc link" defaultValue={a.cover_letter_link || ''} onBlur={e => onUpdate('cover_letter_link', e.target.value)} /></label>
              <label>Source<input type="text" placeholder="referral, LinkedIn, cold, etc." defaultValue={a.source || ''} onBlur={e => onUpdate('source', e.target.value)} /></label>
              <label>Salary / comp<input type="text" placeholder="e.g. $70k–85k or n/a" defaultValue={a.salary || ''} onBlur={e => onUpdate('salary', e.target.value)} /></label>
              <label>Hiring manager<input type="text" defaultValue={a.hiring_manager || ''} onBlur={e => onUpdate('hiring_manager', e.target.value)} /></label>
              <label>Other connections<input type="text" defaultValue={a.connections || ''} onBlur={e => onUpdate('connections', e.target.value)} /></label>
              <label>Next action<input type="text" placeholder="e.g. follow up with recruiter" defaultValue={a.next_action || ''} onBlur={e => onUpdate('next_action', e.target.value)} /></label>
              <label>Follow-up date<input type="date" value={a.follow_up_date || ''} onChange={e => onUpdate('follow_up_date', e.target.value)} /></label>
              <label>Interview date<input type="date" value={a.interview_date || ''} onChange={e => onUpdate('interview_date', e.target.value)} /></label>
              <label className="notes-field">Notes<textarea className="conv-note" placeholder="interview prep, red flags, anything else" defaultValue={a.notes || ''} onBlur={e => onUpdate('notes', e.target.value)} /></label>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ConversationRow({ convo: c, isOpen, onToggle, onUpdate, onDelete }) {
  return (
    <>
      <tr className="app-row">
        <td className="num-col">
          <input type="date" value={c.date || ''} onChange={e => onUpdate('date', e.target.value)} />
        </td>
        <PersonCell value={c.person} onSave={v => onUpdate('person', v)} onToggle={onToggle} isOpen={isOpen} />
        <EditableCell value={c.context} placeholder="Company" onSave={v => onUpdate('context', v)} />
        <td>
          <textarea className="conv-note" placeholder="job leads, advice, intros…" defaultValue={c.recommendation || ''} onBlur={e => onUpdate('recommendation', e.target.value)} />
        </td>
        <td>
          <textarea className="conv-note" placeholder="anything else worth remembering" defaultValue={c.notes || ''} onBlur={e => onUpdate('notes', e.target.value)} />
        </td>
        <td><button className="del-btn" title="Delete row" onClick={onDelete}>×</button></td>
      </tr>
      {isOpen && (
        <tr className="detail-row">
          <td colSpan={6}>
            <div className="detail-grid">
              <label>Email<input type="text" placeholder="name@company.com" defaultValue={c.email || ''} onBlur={e => onUpdate('email', e.target.value)} /></label>
              <label>Phone<input type="text" placeholder="phone number" defaultValue={c.phone || ''} onBlur={e => onUpdate('phone', e.target.value)} /></label>
              <label>Other contact<input type="text" placeholder="LinkedIn, etc." defaultValue={c.other_contact || ''} onBlur={e => onUpdate('other_contact', e.target.value)} /></label>
            </div>
          </td>
        </tr>
      )}
    </>
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
    <td
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => onSave(e.target.textContent)}
    >
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
      <a
        className="position-link"
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => { e.preventDefault(); setEditing(true) }}
        title="Opens where you applied — double-click to rename"
      >
        {value || 'Position'}
      </a>
    </td>
  )
}

function PersonCell({ value, onSave, onToggle }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <td contentEditable suppressContentEditableWarning autoFocus onBlur={e => { onSave(e.target.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }

  return (
    <td className="person-cell" onClick={onToggle}>
      <span className="position-link">{value || 'Name'}</span>
      <button className="edit-pencil" onClick={e => { e.stopPropagation(); setEditing(true) }} title="Rename">✎</button>
    </td>
  )
}
