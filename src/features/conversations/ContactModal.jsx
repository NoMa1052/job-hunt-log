import { useState } from 'react'
import { todayLocal } from '../../lib/format'
import { Button, Field, Input, Modal, TextArea } from '../../ui'

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

  const contact = (field, label, placeholder) => (
    <Field label={label}>
      <Input type="text" placeholder={placeholder} defaultValue={person[field] || ''} onBlur={e => onUpdate(field, e.target.value)} />
    </Field>
  )

  return (
    <Modal
      onClose={onClose}
      title={<input className="title-input" type="text" defaultValue={person.name} placeholder="Name" aria-label="Name" onBlur={e => onUpdate('name', e.target.value)} />}
      subtitle={<input className="subtitle-input" type="text" defaultValue={person.company} placeholder="Company" aria-label="Company" onBlur={e => onUpdate('company', e.target.value)} />}
    >
      <div className="form-grid">
        {contact('email', 'Email', 'name@company.com')}
        {contact('phone', 'Phone', 'phone number')}
        {contact('other_contact', 'Other contact', 'LinkedIn, etc.')}
      </div>

      <div className="thread">
        <div className="thread-compose">
          <div className="thread-compose-row">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Conversation date" />
            <Button variant="primary" icon="plus" onClick={submitEntry}>Log conversation</Button>
          </div>
          <TextArea placeholder="What they recommended…" aria-label="What they recommended" value={recommendation} onChange={e => setRecommendation(e.target.value)} />
          <TextArea placeholder="Anything else worth remembering…" aria-label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="thread-list">
          {entries.length === 0 && <p className="thread-empty">No conversations logged yet.</p>}
          {entries.map(e => (
            <div key={e.id} className="thread-entry">
              <div className="thread-date">{e.date || 'No date'}</div>
              {e.recommendation && <div className="thread-text"><strong>Recommended:</strong> {e.recommendation}</div>}
              {e.notes && <div className="thread-text">{e.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
