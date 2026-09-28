import { useData } from '../state/DataProvider'

export default function SaveStatus() {
  const { save, reloadAll } = useData()
  if (save.error) {
    return (
      <footer className="saved-tag save-error" role="alert">
        Not saved: {save.error}{' '}
        <button className="link-btn" onClick={reloadAll}>Reload data</button>{' '}
        <button className="link-btn" onClick={save.dismiss}>Dismiss</button>
      </footer>
    )
  }
  if (save.pending > 0) return <footer className="saved-tag" aria-live="polite">Saving…</footer>
  return <footer className="saved-tag" aria-live="polite">{save.savedOnce ? 'All changes saved' : ''}</footer>
}
