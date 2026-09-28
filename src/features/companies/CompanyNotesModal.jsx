import { useState } from 'react'
import { formatDate } from '../../lib/format'
import { Modal } from '../../ui'

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
      title={<span className="modal-title-static">{company.company || 'Company'}</span>}
      subtitle={<span className="modal-subtitle-static">Notes</span>}
    >
        <div className="thread-section" style={{ paddingTop: 18 }}>
          <div className="thread-add">
            <textarea className="conv-note" placeholder="Add a note…" value={draft} onChange={e => setDraft(e.target.value)} />
            <button className="add-btn" onClick={submit}>+ Add note</button>
          </div>
          <div className="thread-list">
            {notes.length === 0 && <p className="thread-empty">No notes yet.</p>}
            {notes.map(n => (
              <div key={n.id} className="thread-entry">
                <div className="thread-entry-date">{formatDate(n.created_at)}</div>
                <div className="thread-entry-text">{n.note}</div>
              </div>
            ))}
          </div>
        </div>
    </Modal>
  )
}
