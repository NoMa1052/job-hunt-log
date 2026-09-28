import { useState } from 'react'
import Select from './Select'
import { IconButton } from './Button'

// Inline-editable text cell. Saves on blur.
export function EditableCell({ value, placeholder, onSave, className = '' }) {
  return (
    <td
      className={`ui-cell-edit ${className}`.trim()}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => onSave(e.currentTarget.textContent)}
    >
      {value || ''}
    </td>
  )
}

// Text that links out when `href` is set; double-click to rename.
export function EditableLinkCell({ value, href, placeholder, onSave, title }) {
  const [editing, setEditing] = useState(false)
  if (!href) return <EditableCell value={value} placeholder={placeholder} onSave={onSave} />
  if (editing) {
    return (
      <td className="ui-cell-edit" contentEditable suppressContentEditableWarning autoFocus
        ref={el => el && el.focus()}
        onBlur={e => { onSave(e.currentTarget.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td>
      <a className="ui-cell-link" href={href} target="_blank" rel="noopener noreferrer"
        onDoubleClick={e => { e.preventDefault(); setEditing(true) }}
        title={title}>
        {value || placeholder}
      </a>
    </td>
  )
}

// Text that opens something on click, with a pencil button to rename.
export function EditableActionCell({ value, placeholder, onSave, onOpen }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td className="ui-cell-edit" contentEditable suppressContentEditableWarning
        ref={el => el && el.focus()}
        onBlur={e => { onSave(e.currentTarget.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td className="ui-cell-action">
      <button type="button" className="ui-cell-link ui-cell-link--button" onClick={onOpen}>{value || placeholder}</button>
      <IconButton icon="pencil" label="Rename" size="sm" className="ui-cell-pencil" onClick={() => setEditing(true)} />
    </td>
  )
}

export function DateCell({ value, onChange }) {
  return (
    <td className="ui-cell-num">
      <input className="ui-cell-date" type="date" value={value || ''} onChange={e => onChange(e.target.value)} />
    </td>
  )
}

export function SelectCell({ options, value, onChange, label }) {
  return (
    <td>
      <Select pill options={options} value={value} onChange={onChange} aria-label={label} />
    </td>
  )
}
