// options: [{ value, label, tone? }]. With `pill`, renders as a colored badge
// that stays a native <select>; otherwise it's a regular sk-input field.
export default function Select({ options, value, onChange, pill = false, className = '', ...props }) {
  const current = options.find(o => o.value === value)
  const classes = pill ? `ui-select--pill ui-tone--${current?.tone || 'neutral'}` : 'sk-input'
  return (
    <select className={`${classes} ${className}`.trim()} value={value} onChange={e => onChange(e.target.value)} {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
