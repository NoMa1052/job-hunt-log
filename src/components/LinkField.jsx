import { useState } from 'react'
import { safeUrl } from '../lib/url'
import { Button, Field, Icon, IconButton, Input } from '../ui'

// A saved link shows as a button that opens it; empty ones start as "+ Add".
export default function LinkField({ def, value, onSave, onOpen }) {
  const [editing, setEditing] = useState(false)
  const href = safeUrl(value)

  if (editing || (value && !href)) {
    return (
      <Field label={def.label} error={value && !href && !editing ? 'That link doesn’t look right. Paste a full web address starting with https://.' : undefined}>
        <Input
          type="url"
          autoFocus={editing}
          placeholder={def.placeholder}
          defaultValue={value || ''}
          onBlur={e => { onSave(e.target.value.trim()); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
      </Field>
    )
  }
  if (!href) {
    return <Button variant="ghost" size="sm" icon="plus" onClick={() => setEditing(true)}>{def.add}</Button>
  }
  return (
    <div className="panel-link">
      <a className="sk-btn sk-btn--secondary panel-link-open" href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
        <Icon name="external-link" />
        {def.open || `Open ${def.label.toLowerCase()}`}
      </a>
      <IconButton icon="pencil" className="panel-link-edit" label={`Edit ${def.label.toLowerCase()} link`} onClick={() => setEditing(true)} />
    </div>
  )
}
