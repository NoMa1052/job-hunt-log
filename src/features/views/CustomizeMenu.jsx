import { useRef, useState } from 'react'
import { Button, Icon, IconButton, Popover } from '../../ui'
import NameForm from './NameForm'

const DIRECTIONS = {
  text: ['A to Z', 'Z to A'],
  date: ['Oldest first', 'Newest first'],
  number: ['Lowest first', 'Highest first'],
  select: ['In order', 'Reverse order'],
}

// One "Customize" menu per tab: filters, sort, columns (show, hide, reorder),
// "Save as view" and "Reset". Filters are plain dropdowns, one per column;
// list columns (like Status) can match several values.
export default function CustomizeMenu({ model, config, onChange, onReset, canReset, onSaveAs, noun }) {
  const active = config.filters.length
  return (
    <Popover
      align="end"
      className="customize-popover"
      trigger={({ open, toggle }) => (
        <Button variant="secondary" icon="sliders" onClick={toggle} aria-expanded={open}>
          {active ? `Customize · ${active}` : 'Customize'}
        </Button>
      )}
    >
      {({ close }) => (
        <Panel model={model} config={config} onChange={onChange} onReset={onReset} canReset={canReset} onSaveAs={onSaveAs} noun={noun} close={close} />
      )}
    </Popover>
  )
}

function Panel({ model, config, onChange, onReset, canReset, onSaveAs, noun, close }) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="customize" role="group" aria-label="Customize">
      <section className="customize-section" aria-labelledby="customize-filter">
        <h3 className="customize-title" id="customize-filter">Filter</h3>
        <Filters model={model} filters={config.filters} onChange={filters => onChange({ filters })} noun={noun} />
      </section>
      <section className="customize-section" aria-labelledby="customize-sort">
        <h3 className="customize-title" id="customize-sort">Sort</h3>
        <SortPicker model={model} sort={config.sort} onChange={sort => onChange({ sort })} />
      </section>
      <section className="customize-section" aria-labelledby="customize-columns">
        <h3 className="customize-title" id="customize-columns">Columns</h3>
        <ColumnList model={model} columns={config.columns} onChange={columns => onChange({ columns })} />
      </section>
      <div className="customize-footer">
        {saving
          ? <NameForm label="View name" submitLabel="Save view" onCancel={() => setSaving(false)} onSubmit={name => { close(); onSaveAs(name) }} />
          : (
            <>
              <Button variant="ghost" size="sm" disabled={!canReset} onClick={onReset}>Reset</Button>
              {onSaveAs && <Button variant="primary" size="sm" onClick={() => setSaving(true)}>Save as view</Button>}
            </>
          )}
      </div>
    </div>
  )
}

// Show/hide columns and change their order (drag, or the arrow buttons).
function ColumnList({ model, columns, onChange }) {
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
    <ul className="columns-menu">
      {columns.map((c, idx) => {
        const label = model.column(c.key).label
        return (
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
              {label}
            </label>
            <IconButton icon="arrow-up" size="sm" label={`Move ${label} up`} disabled={idx === 0} onClick={() => move(idx, idx - 1)} />
            <IconButton icon="arrow-down" size="sm" label={`Move ${label} down`} disabled={idx === columns.length - 1} onClick={() => move(idx, idx + 1)} />
          </li>
        )
      })}
    </ul>
  )
}

function SortPicker({ model, sort, onChange }) {
  const sortable = model.columns.filter(c => DIRECTIONS[c.type])
  const col = sort && model.column(sort.key)
  return (
    <div className="customize-row">
      <select className="sk-input" aria-label="Sort by" value={sort?.key || ''} onChange={e => onChange(e.target.value ? { key: e.target.value, dir: sort?.dir || 'asc' } : null)}>
        <option value="">No sorting</option>
        {sortable.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      {col && (
        <select className="sk-input" aria-label="Sort direction" value={sort.dir} onChange={e => onChange({ ...sort, dir: e.target.value })}>
          <option value="asc">{DIRECTIONS[col.type][0]}</option>
          <option value="desc">{DIRECTIONS[col.type][1]}</option>
        </select>
      )}
    </div>
  )
}

function Filters({ model, filters, onChange, noun }) {
  const used = new Set(filters.map(f => f.key))
  const unused = model.columns.filter(c => !used.has(c.key))
  const update = (id, patch) => onChange(filters.map(f => (f.id === id ? { ...f, ...patch } : f)))
  const changeColumn = (id, key) => onChange(filters.map(f => (f.id === id ? { ...model.newFilter(key), id } : f)))
  const changeOp = (f, op) => {
    const def = model.operatorsFor(f.key).find(o => o.op === op)
    const keep = def.needs && model.operatorsFor(f.key).find(o => o.op === f.op)?.needs === def.needs
    update(f.id, { op, value: keep ? f.value : def.needs === 'options' ? [] : '' })
  }

  return (
    <div className="filter-builder">
      {filters.length === 0 && <p className="filter-empty">{`No filters. Showing all ${noun}.`}</p>}
      {filters.map(f => {
        const col = model.column(f.key)
        const opDef = model.operatorsFor(f.key).find(o => o.op === f.op)
        return (
          <div key={f.id} className="filter-row">
            <select className="sk-input filter-select" aria-label="Filter column" value={f.key} onChange={e => changeColumn(f.id, e.target.value)}>
              {[col, ...unused].map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="sk-input filter-select" aria-label="Filter condition" value={f.op} onChange={e => changeOp(f, e.target.value)}>
              {model.operatorsFor(f.key).map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
            </select>
            <IconButton icon="x" size="sm" label={`Remove ${col.label} filter`} onClick={() => onChange(filters.filter(x => x.id !== f.id))} />
            {opDef?.needs && (
              <div className="filter-value">
                {opDef.needs === 'text' && (
                  <input className="sk-input" aria-label={`${col.label} text`} placeholder="Type to filter…" value={f.value} onChange={e => update(f.id, { value: e.target.value })} />
                )}
                {opDef.needs === 'date' && (
                  <input className="sk-input" type="date" aria-label={`${col.label} date`} value={f.value} onChange={e => update(f.id, { value: e.target.value })} />
                )}
                {opDef.needs === 'number' && (
                  <input className="sk-input" type="number" min="0" inputMode="numeric" aria-label={`${col.label} number`} value={f.value} onChange={e => update(f.id, { value: e.target.value })} />
                )}
                {opDef.needs === 'options' && (
                  <div className="filter-options" role="group" aria-label={`${col.label} values`}>
                    {col.options.map(o => (
                      <label key={o.value} className="filter-option">
                        <input
                          type="checkbox"
                          checked={f.value.includes(o.value)}
                          onChange={() => update(f.id, { value: f.value.includes(o.value) ? f.value.filter(v => v !== o.value) : [...f.value, o.value] })}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="filter-footer">
        <Button variant="ghost" size="sm" icon="plus" disabled={unused.length === 0} onClick={() => onChange([...filters, model.newFilter(unused[0].key)])}>Add filter</Button>
        {filters.length > 0 && <Button variant="link" onClick={() => onChange([])}>Clear filters</Button>}
      </div>
    </div>
  )
}
