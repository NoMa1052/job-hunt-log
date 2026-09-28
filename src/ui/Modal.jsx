import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'

// Blur the focused field first so its onBlur save runs before the modal
// unmounts (closing with Escape wouldn't otherwise fire blur).
function blurActive() {
  const el = document.activeElement
  if (el && typeof el.blur === 'function') el.blur()
}

export default function Modal({ title, subtitle, onClose, size = 'md', role = 'dialog', children, footer }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); blurActive(); closeRef.current() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus()
    }
  }, [])

  return createPortal(
    <div className="ui-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { blurActive(); onClose() } }}>
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal--${size}`}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(title || subtitle) && (
          <div className="ui-modal-header">
            <div className="ui-modal-titles" id={titleId}>
              {title}
              {subtitle}
            </div>
            <IconButton icon="x" label="Close" className="ui-modal-close" onClick={() => { blurActive(); onClose() }} />
          </div>
        )}
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
