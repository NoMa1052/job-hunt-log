import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'

// Blur the focused field first so its onBlur save runs before the panel
// closes (closing with Escape wouldn't otherwise fire blur).
function blurActive() {
  const el = document.activeElement
  if (el && typeof el.blur === 'function') el.blur()
}

// A right-side detail panel. Not modal on desktop: the page behind stays
// visible and usable. Full screen on narrow screens.
export default function SidePanel({ label, header, onClose, children }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    function onKey(e) {
      // Let open popovers inside the panel handle Escape first.
      if (e.key !== 'Escape' || document.querySelector('.ui-side-panel .ui-popover')) return
      blurActive()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return createPortal(
    <aside
      ref={panelRef}
      className="ui-side-panel"
      role="dialog"
      aria-modal="false"
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
      tabIndex={-1}
    >
      <div className="ui-side-panel-header">
        <div className="ui-side-panel-titles" id={titleId}>{header}</div>
        <IconButton icon="x" label="Close" onClick={() => { blurActive(); onClose() }} />
      </div>
      <div className="ui-side-panel-body">{children}</div>
    </aside>,
    document.body
  )
}
