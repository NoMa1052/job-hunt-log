import { Button, IconButton, Popover } from '../../ui'
import { ALL_COLUMNS } from './options'
import { column, newFilter, operatorsFor } from './views'

// Filter builder: a list of conditions that must all match.
export default function FilterBuilder({ filters, onChange }) {
  const active = filters.length
  const update = (id, patch) => onChange(filters.map(f => (f.id === id ? { ...f, ...patch } : f)))
  const changeColumn = (id, key) => onChange(filters.map(f => (f.id === id ? { ...newFilter(key), id } : f)))
  const changeOp = (f, op) => {
    const def = operatorsFor(f.key).find(o => o.op === op)
    const keep = def.needs && operatorsFor(f.key).find(o => o.op === f.op)?.needs === def.needs
    update(f.id, { op, value: keep ? f.value : def.needs === 'options' ? [] : '' })
  }

  return (
    <Popover
      align="end"
      className="filter-popover"
      trigger={({ open, toggle }) => (
        <Button variant="secondary" icon="filter" onClick={toggle} aria-expanded={open}>
          {active ? `Filter · ${active}` : 'Filter'}
        </Button>
      )}
    >
      <div className="filter-builder" role="group" aria-label="Filters">
        {filters.length === 0 && <p className="filter-empty">No filters. Showing every application.</p>}
        {filters.map((f, i) => {
          const col = column(f.key)
          const opDef = operatorsFor(f.key).find(o => o.op === f.op)
          return (
            <div key={f.id} className="filter-row">
              <span className="filter-join">{i === 0 ? 'Where' : 'and'}</span>
              <select className="sk-input filter-select" aria-label="Column" value={f.key} onChange={e => changeColumn(f.id, e.target.value)}>
                {ALL_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <select className="sk-input filter-select" aria-label="Condition" value={f.op} onChange={e => changeOp(f, e.target.value)}>
                {operatorsFor(f.key).map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
              </select>
              <div className="filter-value">
                {opDef?.needs === 'text' && (
                  <input className="sk-input" aria-label="Value" placeholder="Type to filter…" value={f.value} onChange={e => update(f.id, { value: e.target.value })} />
                )}
                {opDef?.needs === 'date' && (
                  <input className="sk-input" type="date" aria-label="Date" value={f.value} onChange={e => update(f.id, { value: e.target.value })} />
                )}
                {opDef?.needs === 'options' && (
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
              <IconButton icon="x" size="sm" label="Remove filter" onClick={() => onChange(filters.filter(x => x.id !== f.id))} />
            </div>
          )
        })}
        <div className="filter-footer">
          <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange([...filters, newFilter('company')])}>Add filter</Button>
          {filters.length > 0 && <Button variant="link" onClick={() => onChange([])}>Clear all</Button>}
        </div>
      </div>
    </Popover>
  )
}
