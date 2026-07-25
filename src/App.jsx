import { useEffect, useState, useCallback } from 'react'
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

function optionClass(list, value, fallback) {
  const m = list.find(s => s.value === value)
  return m ? m.cls : fallback
}

export default function App() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [conversations, setConversations] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [saving, setSaving] = useState('')

  useEffect(() => {
    loadApplications()
    loadConversations()
  }, [])

  async function loadApplications() {
    const { data } = await supabase.from('applications').select('*').order('date_applied', { ascending: false, nullsFirst: false })
    setApplications(data || [])
  }

  async function loadConversations() {
    const { data } = await supabase.from('conversations').select('*').order('date', { ascending: false, nullsFirst: false })
    setConversations(data || [])
  }

  const flagSaving = useCallback(() => {
    setSaving('Saving…')
    setTimeout(() => setSaving('Saved'), 400)
  }, [])

  function toggleExpanded(id) {
    setExpanded(prev => {
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
      setExpanded(prev => new Set(prev).add(data.id))
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
      person: '', context: '', recommendation: '', notes: ''
    }).select().single()
    if (!error && data) setConversations(prev => [data, ...prev])
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

  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  const active = applications.length - counts.rejected - counts.withdrawn

  return (
    <div className="wrap">
      <h2 className="sr-only">Job hunt tracker with an applications ledger and a networking conversation log.</h2>

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
      </div>

      {tab === 'applications' && (
        <div className="panel">
          <div className="panel-head">
            <p>Click a row to see source, salary, contacts, and notes. Cell edits save automatically.</p>
            <button className="add-btn" onClick={addApplication}>+ Add application</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th>Company</th><th>Position</th><th>Location</th><th>Applied</th>
                  <th>Status</th><th>Priority</th><th style={{ width: 60 }}>Letter</th><th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <ApplicationRow
                    key={a.id}
                    app={a}
                    isOpen={expanded.has(a.id)}
                    onToggle={() => toggleExpanded(a.id)}
                    onUpdate={(field, value) => updateApplication(a.id, field, value)}
                    onDelete={() => deleteApplication(a.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {applications.length === 0 && <div className="empty-state">No applications logged yet. Add your first one above.</div>}
        </div>
      )}

      {tab === 'conversations' && (
        <div className="panel">
          <div className="panel-head">
            <p>Log who you talked to, what they recommended, and anything worth remembering.</p>
            <button className="add-btn" onClick={addConversation}>+ Add conversation</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 130 }}>Person</th>
                  <th style={{ width: 150 }}>Company / context</th>
                  <th style={{ width: 260 }}>What they recommended</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {conversations.map(c => (
                  <tr key={c.id}>
                    <td className="num-col">
                      <input type="date" value={c.date || ''} onChange={e => updateConversation(c.id, 'date', e.target.value)} />
                    </td>
                    <EditableCell value={c.person} placeholder="Name" onSave={v => updateConversation(c.id, 'person', v)} />
                    <EditableCell value={c.context} placeholder="Company" onSave={v => updateConversation(c.id, 'context', v)} />
                    <td>
                      <textarea className="conv-note" placeholder="job leads, advice, intros…" defaultValue={c.recommendation || ''} onBlur={e => updateConversation(c.id, 'recommendation', e.target.value)} />
                    </td>
                    <td>
                      <textarea className="conv-note" placeholder="anything else worth remembering" defaultValue={c.notes || ''} onBlur={e => updateConversation(c.id, 'notes', e.target.value)} />
                    </td>
                    <td><button className="del-btn" title="Delete row" onClick={() => deleteConversation(c.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {conversations.length === 0 && <div className="empty-state">No conversations logged yet. Add one above.</div>}
        </div>
      )}

      <footer className="saved-tag">{saving}</footer>
    </div>
  )
}

function ApplicationRow({ app: a, isOpen, onToggle, onUpdate, onDelete }) {
  return (
    <>
      <tr className="app-row">
        <td className="expand-cell" onClick={onToggle}>
          <span className={'chevron' + (isOpen ? ' open' : '')}>›</span>
        </td>
        <EditableCell value={a.company} placeholder="Company" onSave={v => onUpdate('company', v)} />
        <EditableCell value={a.position} placeholder="Position" onSave={v => onUpdate('position', v)} />
        <EditableCell value={a.location} placeholder="Location" onSave={v => onUpdate('location', v)} />
        <td className="num-col">
          <input type="date" value={a.date_applied || ''} onChange={e => onUpdate('date_applied', e.target.value)} />
        </td>
        <td>
          <select className={'status-select ' + optionClass(STATUS_OPTIONS, a.status, 'st-applied')} value={a.status || 'applied'} onChange={e => onUpdate('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </td>
        <td>
          <select className={'priority-select ' + optionClass(PRIORITY_OPTIONS, a.priority, 'pr-medium')} value={a.priority || 'medium'} onChange={e => onUpdate('priority', e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </td>
        <td style={{ textAlign: 'center' }}>
          {a.cover_letter_link
            ? <a className="letter-link" href={a.cover_letter_link} target="_blank" rel="noopener noreferrer" title="Open cover letter" onClick={e => e.stopPropagation()}><i className="ti ti-file-text" /></a>
            : <span className="letter-link-empty">—</span>}
        </td>
        <td><button className="del-btn" title="Delete row" onClick={onDelete}>×</button></td>
      </tr>
      {isOpen && (
        <tr className="detail-row">
          <td colSpan={9}>
            <div className="detail-grid">
              <label>Cover letter link<input type="url" placeholder="paste Google Doc link" defaultValue={a.cover_letter_link || ''} onBlur={e => onUpdate('cover_letter_link', e.target.value)} /></label>
              <label>Job posting link<input type="url" placeholder="paste posting link" defaultValue={a.link || ''} onBlur={e => onUpdate('link', e.target.value)} /></label>
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
