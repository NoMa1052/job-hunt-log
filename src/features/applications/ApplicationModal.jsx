import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './options'

export default function ApplicationModal({ app, onUpdate, onClose }) {
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
