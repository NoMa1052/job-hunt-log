import { Children, cloneElement, isValidElement, useId } from 'react'

// A labelled field: label.sk-field > span.sk-label + control + optional span.sk-hint.
// Pass `error` (a message saying how to fix it) to show the error state.
// The control is named by the label text only; the hint is its description.
export function Field({ label, hint, error, className = '', children }) {
  const id = useId()
  const message = error || hint
  const control = Children.only(children)
  const described = isValidElement(control)
    ? cloneElement(control, {
        'aria-labelledby': `${id}-label`,
        'aria-describedby': message ? `${id}-hint` : undefined,
        'aria-invalid': error ? true : control.props['aria-invalid'],
      })
    : control
  return (
    <label className={`sk-field ${error ? 'sk-field--error' : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <span className="sk-label" id={`${id}-label`}>{label}</span>
      {described}
      {message && <span className="sk-hint" id={`${id}-hint`} role={error ? 'alert' : undefined}>{message}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`sk-input ${className}`.trim()} {...props} />
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`sk-input ${className}`.trim()} {...props} />
}
