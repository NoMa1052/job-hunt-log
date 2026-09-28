import { useState } from 'react'

export function EditableCell({ value, placeholder, onSave }) {
  return (
    <td contentEditable suppressContentEditableWarning data-placeholder={placeholder} onBlur={e => onSave(e.target.textContent)}>
      {value || ''}
    </td>
  )
}

export function PositionCell({ value, link, onSave }) {
  const [editing, setEditing] = useState(false)
  if (!link) return <EditableCell value={value} placeholder="Position" onSave={onSave} />
  if (editing) {
    return (
      <td contentEditable suppressContentEditableWarning autoFocus onBlur={e => { onSave(e.target.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td>
      <a className="position-link" href={link} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => { e.preventDefault(); setEditing(true) }}
        title="Opens where you applied — double-click to rename">
        {value || 'Position'}
      </a>
    </td>
  )
}

export function PersonCell({ value, onSave, onOpenModal }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <td contentEditable suppressContentEditableWarning autoFocus onBlur={e => { onSave(e.target.textContent); setEditing(false) }}>
        {value || ''}
      </td>
    )
  }
  return (
    <td className="person-cell">
      <span className="position-link" onClick={onOpenModal}>{value || 'Name'}</span>
      <button className="edit-pencil" onClick={e => { e.stopPropagation(); setEditing(true) }} title="Rename">✎</button>
    </td>
  )
}
