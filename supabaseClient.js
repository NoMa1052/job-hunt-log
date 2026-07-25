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

function statusClass(value) {
  const m = STATUS_OPTIONS.find(s => s.value === value)
  return m ? m.cls : 'st-applied'
}

export default function App() {
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [conversations, setConversations] = useState([])
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

  async function addApplication() {
    const { data, error } = await supabase.from('applications').insert({
      company: '', position: '', location: '', status: 'applied', cover_letter: false
    }).select().single()
    if (!error && data) setApplications(prev => [data, ...prev])
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
            <p>One row per role. Click any cell to edit, it saves automatically.</p>
            <button className="add-btn" onClick={addApplication}>+ Add application</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Position</th><th>Location</th><th>Applied</th>
                  <th>Status</th><th>Cover letter</th><th>Hiring manager</th>
                  <th>Other connections</th><th>Link</th><th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id}>
                    <EditableCell value={a.company} placeholder="Company" onSave={v => updateApplication(a.id, 'company', v)} />
                    <EditableCell value={a.position} placeholder="Position" onSave={v => updateApplication(a.id, 'position', v)} />
                    <EditableCell value={a.location} placeholder="Location" onSave={v => updateApplication(a.id, 'location', v)} />
                    <td className="num-col">
                      <input type="date" value={a.date_applied || ''} onChange={e => updateApplication(a.id, 'date_applied', e.target.value)} />
                    </td>
                    <td>
                      <select className={'status-select ' + statusClass(a.status)} value={a.status || 'applied'} onChange={e => updateApplication(a.id, 'status', e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" className="cover-check" checked={!!a.cover_letter} onChange={e => updateApplication(a.id, 'cover_letter', e.target.checked)} />
                    </td>
                    <EditableCell value={a.hiring_manager} placeholder="—" onSave={v => updateApplication(a.id, 'hiring_manager', v)} />
                    <EditableCell value={a.connections} placeholder="—" onSave={v => updateApplication(a.id, 'connections', v)} />
                    <td className="link-cell">
                      <input type="url" placeholder="paste link" defaultValue={a.link || ''} onBlur={e => updateApplication(a.id, 'link', e.target.value)} />
                    </td>
                    <td><button className="del-btn" title="Delete row" onClick={() => deleteApplication(a.id)}>×</button></td>
                  </tr>
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
