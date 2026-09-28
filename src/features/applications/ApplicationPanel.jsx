import { useState } from 'react'
import LinkField from '../../components/LinkField'
import PanelDelete from '../../components/PanelDelete'
import { Button, Chip, Field, FollowUp, Input, Popover, SidePanel, TextArea } from '../../ui'
import { PRIORITY_OPTIONS, STATUS_OPTIONS, followUp, optionLabel, statusChip } from './options'

// Optional details: shown when filled, otherwise behind a "+ Add" button.
const DETAILS = [
  { key: 'location', label: 'Location' },
  { key: 'source', label: 'Source', placeholder: 'referral, LinkedIn, cold, etc.' },
  { key: 'salary', label: 'Salary / comp', placeholder: 'e.g. $70k–85k or n/a' },
  { key: 'hiring_manager', label: 'Hiring manager' },
  { key: 'connections', label: 'Other connections' },
  { key: 'interview_date', label: 'Interview date', type: 'date' },
]

const LINKS = [
  { key: 'link', label: 'Job posting', add: 'Add job posting link', placeholder: 'paste the link to where you applied' },
  { key: 'cover_letter_link', label: 'Cover letter', add: 'Add cover letter link', placeholder: 'paste Google Doc link' },
]

export default function ApplicationPanel({ app, onUpdate, onDelete, onClose }) {
  const [revealed, setRevealed] = useState(() => new Set())
  const reveal = key => setRevealed(prev => new Set(prev).add(key))
  const hideIfEmpty = (key, value) => {
    if (!value) setRevealed(prev => { const next = new Set(prev); next.delete(key); return next })
  }
  const saveText = key => e => { onUpdate(key, e.target.value.trim() ? e.target.value : ''); hideIfEmpty(key, e.target.value.trim()) }

  const shown = DETAILS.filter(d => app[d.key] || revealed.has(d.key))
  const hidden = DETAILS.filter(d => !app[d.key] && !revealed.has(d.key))
  const status = statusChip(app.status)
  const fu = followUp(app)

  return (
    <SidePanel
      label={`${app.company || 'Untitled application'} details`}
      onClose={onClose}
      header={
        <>
          <input className="title-input" type="text" defaultValue={app.company} placeholder="Company" aria-label="Company" onBlur={e => onUpdate('company', e.target.value)} />
          <input className="subtitle-input" type="text" defaultValue={app.position} placeholder="Role" aria-label="Role" onBlur={e => onUpdate('position', e.target.value)} />
          <div className="panel-tags">
            <TagMenu
              label="Status"
              current={<Chip kind={status.kind}>{status.label}</Chip>}
              options={STATUS_OPTIONS.map(o => ({ value: o.value, node: <Chip kind={o.chip}>{o.label}</Chip> }))}
              value={app.status || 'applied'}
              onChange={v => onUpdate('status', v)}
            />
            <TagMenu
              label="Priority"
              current={<span className="priority-tag">{optionLabel(PRIORITY_OPTIONS, app.priority, 'medium')} priority</span>}
              options={PRIORITY_OPTIONS.map(o => ({ value: o.value, node: <span className="priority-tag">{o.label} priority</span> }))}
              value={app.priority || 'medium'}
              onChange={v => onUpdate('priority', v)}
            />
          </div>
        </>
      }
    >
      <section className="key-strip" aria-label="Key dates and next step">
        <label className="key-item">
          <span className="key-label">Applied</span>
          <Input type="date" className="key-input" value={app.date_applied || ''} onChange={e => onUpdate('date_applied', e.target.value)} />
        </label>
        <label className="key-item key-item--wide">
          <span className="key-label">Next action</span>
          <Input type="text" className="key-input" placeholder="e.g. Email recruiter" defaultValue={app.next_action || ''} onBlur={e => onUpdate('next_action', e.target.value)} />
        </label>
        <label className="key-item">
          <span className="key-label">Follow-up</span>
          <Input type="date" className="key-input" value={app.follow_up_date || ''} onChange={e => onUpdate('follow_up_date', e.target.value)} />
        </label>
        {app.follow_up_date && fu.state !== 'upcoming' && (
          <div className="key-note"><FollowUp state={fu.state}>{fu.text}</FollowUp></div>
        )}
      </section>

      <section className="panel-section" aria-label="Links">
        <div className="panel-links">
          {LINKS.map(l => (
            <LinkField key={l.key} def={l} value={app[l.key]} onSave={v => onUpdate(l.key, v)} />
          ))}
        </div>
      </section>

      {(shown.length > 0 || hidden.length > 0) && (
        <section className="panel-section" aria-label="Details">
          {shown.length > 0 && (
            <div className="panel-fields">
              {shown.map(d => (
                <Field key={d.key} label={d.label}>
                  {d.type === 'date'
                    ? <Input type="date" value={app[d.key] || ''} autoFocus={revealed.has(d.key) && !app[d.key]} onChange={e => onUpdate(d.key, e.target.value)} onBlur={e => hideIfEmpty(d.key, e.target.value)} />
                    : <Input type="text" placeholder={d.placeholder} defaultValue={app[d.key] || ''} autoFocus={revealed.has(d.key) && !app[d.key]} onBlur={saveText(d.key)} />}
                </Field>
              ))}
            </div>
          )}
          {hidden.length > 0 && (
            <div className="panel-adds">
              {hidden.map(d => (
                <Button key={d.key} variant="ghost" size="sm" icon="plus" onClick={() => reveal(d.key)}>{`Add ${d.label.toLowerCase()}`}</Button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="panel-section panel-notes">
        <Field label="Notes">
          <TextArea placeholder="Interview prep, red flags, anything else" defaultValue={app.notes || ''} onBlur={e => onUpdate('notes', e.target.value)} />
        </Field>
      </section>

      <PanelDelete label="Delete application" onDelete={onDelete} />
    </SidePanel>
  )
}

// A tag that opens a small menu of choices.
function TagMenu({ label, current, options, value, onChange }) {
  return (
    <Popover
      trigger={({ open, toggle }) => (
        <button type="button" className="tag-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: change`} onClick={toggle}>
          {current}
          <span className="tag-caret" aria-hidden="true">▾</span>
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" aria-label={label}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              className="tag-option"
              onClick={() => { onChange(o.value); close() }}
            >
              {o.node}
              {o.value === value && <span className="tag-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}
