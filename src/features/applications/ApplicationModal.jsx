import { Field, Input, Modal, Select, TextArea } from '../../ui'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './options'

export default function ApplicationModal({ app, onUpdate, onClose }) {
  // Text fields save on blur; dates and selects save on change.
  const text = (field, props = {}) => (
    <Input type="text" defaultValue={app[field] || ''} onBlur={e => onUpdate(field, e.target.value)} {...props} />
  )
  const date = field => (
    <Input type="date" value={app[field] || ''} onChange={e => onUpdate(field, e.target.value)} />
  )

  return (
    <Modal
      onClose={onClose}
      title={<input className="title-input" type="text" defaultValue={app.company} placeholder="Company" aria-label="Company" onBlur={e => onUpdate('company', e.target.value)} />}
      subtitle={<input className="subtitle-input" type="text" defaultValue={app.position} placeholder="Position" aria-label="Position" onBlur={e => onUpdate('position', e.target.value)} />}
    >
      <div className="form-grid">
        <Field label="Location">{text('location')}</Field>
        <Field label="Status"><Select options={STATUS_OPTIONS} value={app.status || 'applied'} onChange={v => onUpdate('status', v)} /></Field>
        <Field label="Priority"><Select options={PRIORITY_OPTIONS} value={app.priority || 'medium'} onChange={v => onUpdate('priority', v)} /></Field>
        <Field label="Date applied">{date('date_applied')}</Field>
        <Field label="Application link">{text('link', { type: 'url', placeholder: 'paste the link to where you applied' })}</Field>
        <Field label="Cover letter link">{text('cover_letter_link', { type: 'url', placeholder: 'paste Google Doc link' })}</Field>
        <Field label="Source">{text('source', { placeholder: 'referral, LinkedIn, cold, etc.' })}</Field>
        <Field label="Salary / comp">{text('salary', { placeholder: 'e.g. $70k–85k or n/a' })}</Field>
        <Field label="Hiring manager">{text('hiring_manager')}</Field>
        <Field label="Other connections">{text('connections')}</Field>
        <Field label="Next action">{text('next_action', { placeholder: 'e.g. follow up with recruiter' })}</Field>
        <Field label="Follow-up date">{date('follow_up_date')}</Field>
        <Field label="Interview date">{date('interview_date')}</Field>
        <Field label="Notes" className="span-all">
          <TextArea placeholder="interview prep, red flags, anything else" defaultValue={app.notes || ''} onBlur={e => onUpdate('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
