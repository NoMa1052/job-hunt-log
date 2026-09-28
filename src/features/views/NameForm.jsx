import { useState } from 'react'
import { Button, Field, Input } from '../../ui'

// Small "name it" form used for new, saved and renamed views.
export default function NameForm({ label, initial = '', submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  return (
    <form
      className="name-form"
      onSubmit={e => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) { setError('Give the view a name, like "Active" or "This week".'); return }
        if (trimmed.length > 60) { setError('Use 60 characters or fewer.'); return }
        onSubmit(trimmed)
      }}
    >
      <Field label={label} error={error || undefined}>
        <Input autoFocus value={name} maxLength={80} onChange={e => { setName(e.target.value); setError('') }} />
      </Field>
      <div className="name-form-actions">
        <Button size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" type="submit">{submitLabel}</Button>
      </div>
    </form>
  )
}
