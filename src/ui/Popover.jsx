import { useEffect, useRef, useState } from 'react'

// trigger: ({ open, toggle }) => element. Closes on outside click or Escape.
export default function Popover({ trigger, align = 'start', className = '', children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="ui-popover-wrap" ref={rootRef}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open && (
        <div className={`ui-popover ui-popover--${align} ${className}`.trim()}>
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}
