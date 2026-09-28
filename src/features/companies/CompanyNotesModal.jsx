import { useState } from 'react'
import { formatDate } from '../../lib/format'
import { Button, Modal, TextArea } from '../../ui'

export default function CompanyNotesModal({ company, notes, onAddNote, onClose }) {
  const [draft, setDraft] = useState('')

  function submit() {
    if (!draft.trim()) return
    onAddNote(draft)
    setDraft('')
  }

  return (
    <Modal
      onClose={onClose}
      title={<span className="title-static">{company.company || 'Company'}</span>}
      subtitle={<span className="subtitle-static">Notes</span>}
    >
      <div className="thread">
        <div className="thread-compose">
          <TextArea placeholder="Add a note…" aria-label="New note" value={draft} onChange={e => setDraft(e.target.value)} />
          <div className="thread-compose-row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" icon="plus" onClick={submit}>Add note</Button>
          </div>
        </div>
        <div className="thread-list">
          {notes.length === 0 && <p className="thread-empty">No notes yet.</p>}
          {notes.map(n => (
            <div key={n.id} className="thread-entry">
              <div className="thread-date">{formatDate(n.created_at)}</div>
              <div className="thread-text">{n.note}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
