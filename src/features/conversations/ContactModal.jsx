import { useState } from 'react'
import { todayLocal } from '../../lib/format'

export default function ContactModal({ person, entries, onUpdate, onAddEntry, onClose }) {
  const [date, setDate] = useState(todayLocal)
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
