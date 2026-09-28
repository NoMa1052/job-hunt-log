// Field wraps any control with a visible label.
export function Field({ label, className = '', children }) {
  return (
    <label className={`ui-field ${className}`.trim()}>
      <span className="ui-field-label">{label}</span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`ui-input ${className}`.trim()} {...props} />
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} {...props} />
}
