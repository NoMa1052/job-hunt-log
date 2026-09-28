import { useRef } from 'react'
import { Button, Icon, IconButton, Popover } from '../../ui'
import { column } from './views'

// Show/hide columns and change their order (drag, or the arrow buttons).
export default function ColumnsMenu({ columns, onChange }) {
  const dragFrom = useRef(null)
  const move = (from, to) => {
    if (to < 0 || to >= columns.length || from === to) return
    const next = [...columns]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }
  const toggle = key => onChange(columns.map(c => (c.key === key ? { ...c, visible: !c.visible } : c)))
  const visibleCount = columns.filter(c => c.visible).length

  return (
    <Popover align="end" trigger={({ open, toggle: t }) => <Button variant="secondary" icon="columns" onClick={t} aria-expanded={open}>Columns</Button>}>
      <ul className="columns-menu" aria-label="Columns">
        {columns.map((c, idx) => (
          <li
            key={c.key}
            className="col-row"
            draggable
            onDragStart={() => { dragFrom.current = idx }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, idx); dragFrom.current = null }}
          >
            <span className="drag-handle" aria-hidden="true"><Icon name="grip" size={14} /></span>
            <label className="ui-popover-row">
              <input type="checkbox" checked={c.visible} disabled={c.visible && visibleCount === 1} onChange={() => toggle(c.key)} />
              {column(c.key).label}
            </label>
            <IconButton icon="arrow-up" size="sm" label={`Move ${column(c.key).label} up`} disabled={idx === 0} onClick={() => move(idx, idx - 1)} />
            <IconButton icon="arrow-down" size="sm" label={`Move ${column(c.key).label} down`} disabled={idx === columns.length - 1} onClick={() => move(idx, idx + 1)} />
          </li>
        ))}
      </ul>
    </Popover>
  )
}
