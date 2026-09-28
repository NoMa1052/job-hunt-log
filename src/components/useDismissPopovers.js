import { useEffect, useRef } from 'react'

// Calls onDismiss when the user clicks anywhere outside a popover.
export default function useDismissPopovers(onDismiss) {
  const ref = useRef(onDismiss)
  ref.current = onDismiss
  useEffect(() => {
    function onClickOutside(e) {
      if (!e.target.closest('.popover') && !e.target.closest('.popover-wrap')) ref.current()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])
}
