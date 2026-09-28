import { useState } from 'react'
import LinkField from '../../components/LinkField'
import { formatDateTimeShort, formatShortDate } from '../../lib/format'
import { useProfile } from '../../state/ProfileProvider'
import { Button, Chip, Field, SidePanel, TextArea } from '../../ui'
import { statusChip } from '../applications/options'

const CAREERS = { key: 'careers_link', label: 'Careers page', add: 'Add careers page link', placeholder: 'paste the careers page link', open: 'Open careers page' }

export default function CompanyPanel({ company, notes, applications, people, onUpdate, onAddNote, onOpenApplication, onOpenPerson, onClose }) {
  const { profile } = useProfile()
  const name = company.company || 'this company'
  const timeline = notes.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  return (
    <SidePanel
      label={`${company.company || 'Unnamed company'} details`}
      onClose={onClose}
      header={
        <input className="title-input" type="text" defaultValue={company.company} placeholder="Company" aria-label="Company" autoFocus={!company.company} onBlur={e => onUpdate('company', e.target.value)} />
      }
    >
      <section className="panel-section" aria-label="Careers page">
        <div className="panel-links">
          <LinkField def={CAREERS} value={company.careers_link} onSave={v => onUpdate('careers_link', v)} onOpen={() => onUpdate('last_clicked', new Date().toISOString())} />
          {company.last_clicked && <p className="panel-hint">Last opened {formatDateTimeShort(company.last_clicked)}</p>}
        </div>
      </section>

      <section className="panel-section" aria-label="Applications">
        <h3 className="panel-heading">Your applications <span className="panel-count">{applications.length}</span></h3>
        {applications.length === 0
          ? <p className="panel-hint">No applications at {name} yet.</p>
          : (
            <ul className="panel-list">
              {applications.map(a => {
                const status = statusChip(a.status)
                return (
                  <li key={a.id}>
                    <button type="button" className="panel-list-item" onClick={() => onOpenApplication(a.id)}>
                      <span className="panel-list-main">{a.position || 'Untitled role'}</span>
                      <span className="panel-list-meta">{a.date_applied ? `Applied ${formatShortDate(a.date_applied, undefined, profile.date_format)}` : ''}</span>
                      <Chip kind={status.kind}>{status.label}</Chip>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
      </section>

      <section className="panel-section" aria-label="People">
        <h3 className="panel-heading">People you know there <span className="panel-count">{people.length}</span></h3>
        {people.length === 0
          ? <p className="panel-hint">Nobody from {name} in Conversations yet.</p>
          : (
            <ul className="panel-list">
              {people.map(p => (
                <li key={p.id}>
                  <button type="button" className="panel-list-item" onClick={() => onOpenPerson(p.id)}>
                    <span className="panel-list-main">{p.name || 'Unnamed person'}</span>
                    <span className="panel-list-meta">{p.talks === 1 ? '1 conversation' : `${p.talks} conversations`}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        {(applications.length > 0 || people.length > 0) && <p className="panel-hint panel-hint--small">Matched by company name.</p>}
      </section>

      <AddNote onAdd={onAddNote} />

      <section className="panel-section panel-timeline" aria-label="Notes">
        <h3 className="panel-heading">Notes</h3>
        {timeline.length === 0 && <p className="panel-hint">No notes yet.</p>}
        <ol className="timeline">
          {timeline.map(n => (
            <li key={n.id} className="timeline-item">
              <div className="timeline-date">{formatShortDate(n.created_at, undefined, profile.date_format)}</div>
              <p className="timeline-text">{n.note}</p>
            </li>
          ))}
        </ol>
      </section>
    </SidePanel>
  )
}

function AddNote({ onAdd }) {
  const [draft, setDraft] = useState('')
  function submit(e) {
    e.preventDefault()
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
  }
  return (
    <form className="panel-section panel-compose" aria-label="Add a note" onSubmit={submit}>
      <Field label="Note">
        <TextArea placeholder="Culture, open roles, who to ask, anything else" value={draft} onChange={e => setDraft(e.target.value)} />
      </Field>
      <div className="panel-compose-actions">
        <Button variant="primary" type="submit" icon="plus" disabled={!draft.trim()}>Add note</Button>
      </div>
    </form>
  )
}
