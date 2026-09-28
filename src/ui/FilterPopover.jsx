import Popover from './Popover'

// A column header that opens a filter. Text filter when `options` is absent,
// otherwise a checkbox list where `selected` holds the allowed values
// (undefined means "all").
export default function FilterPopover({ label, value, onChange, options, selected, onToggle }) {
  const active = options
    ? Boolean(selected && selected.length < options.length)
    : Boolean((value || '').trim())
  return (
    <Popover
      trigger={({ open, toggle }) => (
        <button type="button" className={`ui-filter-trigger ${active ? 'is-active' : ''}`.trim()} aria-expanded={open} onClick={toggle}>
          {label}{active && <span className="ui-filter-dot" aria-label="(filtered)" />}
        </button>
      )}
    >
      {options ? (
        options.map(o => (
          <label key={o.value} className="ui-popover-row">
            <input type="checkbox" checked={!selected || selected.includes(o.value)} onChange={() => onToggle(o.value)} />
            {o.label}
          </label>
        ))
      ) : (
        <input autoFocus className="ui-input ui-input--sm" placeholder="filter…" aria-label={`Filter ${label}`} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </Popover>
  )
}
