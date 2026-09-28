import { useState } from 'react'
import { formatShortDate, todayLocal } from '../../lib/format'
import { mailtoUrl, telUrl, webUrl } from '../../lib/url'
import { useProfile } from '../../state/ProfileProvider'
import { Button, Field, Icon, Input, SidePanel, TextArea } from '../../ui'

// Newest first; undated conversations go last, then by when they were logged.
function byNewest(a, b) {
  if ((a.date || '') !== (b.date || '')) {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date < b.date ? 1 : -1
  }
  return (b.created_at || '').localeCompare(a.created_at || '')
}

export default function PersonPanel({ person, entries, company, onUpdate, onAddEntry, onOpenCompany, onClose }) {
  const { profile } = useProfile()
  const email = mailtoUrl(person.email)
  const phone = telUrl(person.phone)
  const web = webUrl(person.other_contact)
  const isLinkedIn = web && /(^|\.)linkedin\.com$/i.test(new URL(web).hostname)
  const timeline = entries.slice().sort(byNewest)

  return (
    <SidePanel
      label={`${person.name || 'Unnamed person'} details`}
      onClose={onClose}
      header={
        <>
          <input className="title-input" type="text" defaultValue={person.name} placeholder="Name" aria-label="Name" autoFocus={!person.name} onBlur={e => onUpdate('name', e.target.value)} />
          <input className="subtitle-input" type="text" defaultValue={person.company} placeholder="Company" aria-label="Company" onBlur={e => onUpdate('company', e.target.value)} />
          {company && (
            <div className="panel-tags">
              <Button variant="link" onClick={onOpenCompany}>{`View ${company.company}`}</Button>
            </div>
          )}
        </>
      }
    >
      <section className="panel-section" aria-label="Contact">
        {email || phone || web ? (
          <div className="contact-actions">
            {email && <a className="sk-btn sk-btn--secondary" href={email}>Email</a>}
            {phone && <a className="sk-btn sk-btn--secondary" href={phone}>Call</a>}
            {web && (
              <a className="sk-btn sk-btn--secondary" href={web} target="_blank" rel="noopener noreferrer">
                <Icon name="external-link" />
                {isLinkedIn ? 'LinkedIn' : 'Open link'}
              </a>
            )}
          </div>
        ) : (
          <p className="panel-hint">Add an email, phone number or LinkedIn link below to contact them from here.</p>
        )}
        <div className="panel-fields">
          <Field label="Email" error={person.email && !email ? "That email doesn't look right, so there's no Email button." : undefined}>
            <Input type="email" placeholder="name@company.com" defaultValue={person.email || ''} onBlur={e => onUpdate('email', e.target.value.trim())} />
          </Field>
          <Field label="Phone" error={person.phone && !phone ? 'Use digits only (spaces, dashes and a leading + are fine) to get a Call button.' : undefined}>
            <Input type="tel" placeholder="(555) 123-4567" defaultValue={person.phone || ''} onBlur={e => onUpdate('phone', e.target.value.trim())} />
          </Field>
          <Field label="LinkedIn or other" className="span-all">
            <Input type="text" placeholder="linkedin.com/in/… or how else to reach them" defaultValue={person.other_contact || ''} onBlur={e => onUpdate('other_contact', e.target.value.trim())} />
          </Field>
        </div>
      </section>

      <LogConversation onAdd={onAddEntry} />

      <section className="panel-section panel-timeline" aria-label="Conversations">
        <h3 className="panel-heading">Conversations</h3>
        {timeline.length === 0 && <p className="panel-hint">No conversations logged yet.</p>}
        <ol className="timeline">
          {timeline.map(e => (
            <li key={e.id} className="timeline-item">
              <div className="timeline-date">{e.date ? formatShortDate(e.date, undefined, profile.date_format) : 'No date'}</div>
              {e.recommendation && (
                <div className="timeline-rec">
                  <span className="timeline-rec-label">Recommended</span>
                  <p className="timeline-text">{e.recommendation}</p>
                </div>
              )}
              {e.notes && <p className="timeline-text">{e.notes}</p>}
            </li>
          ))}
        </ol>
      </section>
    </SidePanel>
  )
}

// Starts as one button so the timeline stays in view; opens into a form.
function LogConversation({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayLocal)
  const [recommendation, setRecommendation] = useState('')
  const [notes, setNotes] = useState('')
  const empty = !recommendation.trim() && !notes.trim()

  function submit(e) {
    e.preventDefault()
    if (empty) return
    onAdd({ date: date || null, recommendation: recommendation.trim(), notes: notes.trim() })
    setRecommendation('')
    setNotes('')
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="panel-section">
        <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Log a conversation</Button>
      </div>
    )
  }

  return (
    <form className="panel-section panel-compose" aria-label="Log a conversation" onSubmit={submit}>
      <h3 className="panel-heading">Log a conversation</h3>
      <Field label="Date">
        <Input type="date" value={date} autoFocus onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label="What they recommended">
        <TextArea placeholder="People to reach out to, roles to look at, advice" value={recommendation} onChange={e => setRecommendation(e.target.value)} />
      </Field>
      <Field label="Notes">
        <TextArea placeholder="Anything else worth remembering" value={notes} onChange={e => setNotes(e.target.value)} />
      </Field>
      <div className="panel-compose-actions">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" type="submit" icon="plus" disabled={empty}>Log conversation</Button>
      </div>
    </form>
  )
}
