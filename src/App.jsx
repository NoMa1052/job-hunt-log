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

const OPTIONAL_COLUMNS = [
  { key: 'location', label: 'Location' },
  { key: 'date_applied', label: 'Applied' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' },
  { key: 'salary', label: 'Salary' },
  { key: 'follow_up_date', label: 'Follow-up' },
  { key: 'letter', label: 'Letter' }
]
const DEFAULT_VISIBLE = OPTIONAL_COLUMNS.map(c => c.key)

function optionClass(list, value, fallback) {
  const m = list.find(s => s.value === value)
  return m ? m.cls : fallback
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) { return fallback }
}
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (e) { /* ignore */ }
}

export default function App() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [conversations, setConversations] = useState([])
  const [companies, setCompanies] = useState([])
  const [expandedApps, setExpandedApps] = useState(new Set())
  const [expandedConvos, setExpandedConvos] = useState(new Set())
  const [saving, setSaving] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => new Set(loadLocal('jhl-status-filter', STATUS_OPTIONS.map(s => s.value))))
  const [priorityFilter, setPriorityFilter] = useState(() => new Set(loadLocal('jhl-priority-filter', PRIORITY_OPTIONS.map(p => p.value))))
  const [visibleCols, setVisibleCols] = useState(() => new Set(loadLocal('jhl-visible-cols', DEFAULT_VISIBLE)))
  const [openPopover, setOpenPopover] = useState(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    loadApplications()
    loadConversations()
    loadCompanies()
  }, [])

  useEffect(() => { saveLocal('jhl-status-filter', [...statusFilter]) }, [statusFilter])
  useEffect(() => { saveLocal('jhl-priority-filter', [...priorityFilter]) }, [priorityFilter])
  useEffect(() => { saveLocal('jhl-visible-cols', [...visibleCols]) }, [visibleCols])

  useEffect(() => {
    function onClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpenPopover(null)
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

  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  const active = applications.length - counts.rejected - counts.withdrawn

  const filteredApplications = applications.filter(a => {
    if (!statusFilter.has(a.status || 'applied')) return false
    if (!priorityFilter.has(a.priority || 'medium')) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = [a.company, a.position, a.location].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

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
            <p>Click a row to see source, salary, contacts, and notes. Click the position to open where you applied.</p>
            <button className="add-btn" onClick={addApplication}>+ Add application</button>
          </div>

          <div className="toolbar" ref={popoverRef}>
            <input
              className="search-input"
              type="text"
              placeholder="Search company, position, location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="popover-wrap">
              <button className="toolbar-btn" onClick={() => setOpenPopover(openPopover === 'status' ? null : 'status')}>
                Status {statusFilter.size < STATUS_OPTIONS.length ? `(${statusFilter.size})` : ''}
              </button>
              {openPopover === 'status' && (
                <div className="popover">
                  {STATUS_OPTIONS.map(s => (
                    <label key={s.value} className="popover-row">
                      <input type="checkbox" checked={statusFilter.has(s.value)} onChange={() => toggleSet(setStatusFilter, s.value)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="popover-wrap">
              <button className="toolbar-btn" onClick={() => setOpenPopover(openPopover === 'priority' ? null : 'priority')}>
                Priority {priorityFilter.size < PRIORITY_OPTIONS.length ? `(${priorityFilter.size})` : ''}
              </button>
              {openPopover === 'priority' && (
                <div className="popover">
                  {PRIORITY_OPTIONS.map(p => (
                    <label key={p.value} className="popover-row">
                      <input type="checkbox" checked={priorityFilter.has(p.value)} onChange={() => toggleSet(setPriorityFilter, p.value)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="popover-wrap">
              <button className="toolbar-btn" onClick={() => setOpenPopover(openPopover === 'columns' ? null : 'columns')}>
                Columns
              </button>
              {openPopover === 'columns' && (
                <div className="popover">
                  {OPTIONAL_COLUMNS.map(c => (
                    <label key={c.key} className="popover-row">
                      <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleSet(setVisibleCols, c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th>Company</th>
                  <th>Position</th>
                  {visibleCols.has('location') && <th>Location</th>}
                  {visibleCols.has('date_applied') && <th>Applied</th>}
                  {visibleCols.has('status') && <th>Status</th>}
                  {visibleCols.has('priority') && <th>Priority</th>}
                  {visibleCols.has('source') && <th>Source</th>}
                  {visibleCols.has('salary') && <th>Salary</th>}
                  {visibleCols.has('follow_up_date') && <th>Follow-up</th>}
                  {visibleCols.has('letter') && <th style={{ width: 60 }}>Letter</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(a => (
                  <ApplicationRow
                    key={a.id}
                    app={a}
                    visibleCols={visibleCols}
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
              {applications.length === 0 ? 'No applications logged yet. Add your first one above.' : 'Nothing matches the current search/filters.'}
            </div>
          )}
        </div>
      )}

      {tab === 'conversations' && (
        <div className="panel">
          <div className="panel-head">
            <p>Click a row to add contact info. Log what they recommended and anything worth remembering.</p>
            <button className="add-btn" onClick={addConversation}>+ Add conversation</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
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
            <button className="add-btn" onClick={addCompany}>+ Add company</button>
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

function ApplicationRow({ app: a, visibleCols, isOpen, onToggle, onUpdate, onDelete }) {
  const colSpan = 4 + visibleCols.size
  return (
    <>
      <tr className="app-row">
        <td className="expand-cell" onClick={onToggle}>
          <span className={'chevron' + (isOpen ? ' open' : '')}>›</span>
        </td>
        <EditableCell value={a.company} placeholder="Company" onSave={v => onUpdate('company', v)} />
        <PositionCell value={a.position} link={a.link} onSave={v => onUpdate('position', v)} />
        {visibleCols.has('location') && <EditableCell value={a.location} placeholder="Location" onSave={v => onUpdate('location', v)} />}
        {visibleCols.has('date_applied') && (
          <td className="num-col">
            <input type="date" value={a.date_applied || ''} onChange={e => onUpdate('date_applied', e.target.value)} />
          </td>
        )}
        {visibleCols.has('status') && (
          <td>
            <select className={'status-select ' + optionClass(STATUS_OPTIONS, a.status, 'st-applied')} value={a.status || 'applied'} onChange={e => onUpdate('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </td>
        )}
        {visibleCols.has('priority') && (
          <td>
            <select className={'priority-select ' + optionClass(PRIORITY_OPTIONS, a.priority, 'pr-medium')} value={a.priority || 'medium'} onChange={e => onUpdate('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </td>
        )}
        {visibleCols.has('source') && <EditableCell value={a.source} placeholder="—" onSave={v => onUpdate('source', v)} />}
        {visibleCols.has('salary') && <EditableCell value={a.salary} placeholder="—" onSave={v => onUpdate('salary', v)} />}
        {visibleCols.has('follow_up_date') && (
          <td className="num-col">
            <input type="date" value={a.follow_up_date || ''} onChange={e => onUpdate('follow_up_date', e.target.value)} />
          </td>
        )}
        {visibleCols.has('letter') && (
          <td style={{ textAlign: 'center' }}>
            {a.cover_letter_link
              ? <a className="letter-link" href={a.cover_letter_link} target="_blank" rel="noopener noreferrer" title="Open cover letter" onClick={e => e.stopPropagation()}><i className="ti ti-file-text" /></a>
              : <span className="letter-link-empty">—</span>}
          </td>
        )}
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
        <td className="expand-cell" onClick={onToggle}>
          <span className={'chevron' + (isOpen ? ' open' : '')}>›</span>
        </td>
        <td className="num-col">
          <input type="date" value={c.date || ''} onChange={e => onUpdate('date', e.target.value)} />
        </td>
        <EditableCell value={c.person} placeholder="Name" onSave={v => onUpdate('person', v)} />
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
          <td colSpan={7}>
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

  if (!link) {
    return <EditableCell value={value} placeholder="Position" onSave={onSave} />
  }

  if (editing) {
    return (
      <td
        contentEditable
        suppressContentEditableWarning
        autoFocus
        onBlur={e => { onSave(e.target.textContent); setEditing(false) }}
      >
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
