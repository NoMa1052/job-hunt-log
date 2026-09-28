import { useEffect } from 'react'
import { useData } from '../state/DataProvider'
import { Button } from '../ui'

const SHOW_MS = 6000

// "Application deleted. Undo" for a few seconds after a delete.
export default function UndoToast() {
  const { undo } = useData()
  const key = undo?.key
  const dismiss = undo?.dismiss

  useEffect(() => {
    if (!key) return
    const t = setTimeout(dismiss, SHOW_MS)
    return () => clearTimeout(t)
    // Restart the timer only for a new delete, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="undo-region" role="status" aria-live="polite">
      {undo && (
        <div className="undo-toast" key={undo.key}>
          <span>{undo.label}</span>
          <Button variant="link" className="undo-btn" onClick={undo.restore}>Undo</Button>
        </div>
      )}
    </div>
  )
}
