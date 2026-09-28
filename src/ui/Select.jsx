// options: [{ value, label, tone? }]. With `pill`, renders as a colored badge
// that stays a native <select> (keyboard and screen reader friendly).
export default function Select({ options, value, onChange, pill = false, className = '', ...props }) {
  const current = options.find(o => o.value === value)
  const tone = pill ? (current?.tone || 'neutral') : null
  return (
    <select
      className={`ui-select ${pill ? `ui-select--pill ui-tone--${tone}` : ''} ${className}`.trim()}
      value={value}
      onChange={e => onChange(e.target.value)}
      {...props}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
