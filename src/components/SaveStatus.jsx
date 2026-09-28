import { useData } from '../state/DataProvider'
import { Button } from '../ui'

export default function SaveStatus() {
  const { save, reloadAll } = useData()
  if (save.error) {
    return (
      <footer className="save-status is-error" role="alert">
        Not saved: {save.error}
        <Button variant="link" onClick={reloadAll}>Reload data</Button>
        <Button variant="link" onClick={save.dismiss}>Dismiss</Button>
      </footer>
    )
  }
  if (save.pending > 0) return <footer className="save-status" aria-live="polite">Saving…</footer>
  return <footer className="save-status" aria-live="polite">{save.savedOnce ? 'All changes saved' : ''}</footer>
}
