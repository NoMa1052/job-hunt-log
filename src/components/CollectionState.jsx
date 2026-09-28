// Wraps a list's empty state: shows loading or a retryable error instead.
export default function CollectionState({ state, onRetry, children }) {
  if (state.status === 'loading' && state.rows.length === 0) {
    return <div className="empty-state">Loading…</div>
  }
  if (state.status === 'error') {
    return (
      <div className="empty-state error-state">
        Couldn't load this list. {state.error}{' '}
        <button className="link-btn" onClick={onRetry}>Try again</button>
      </div>
    )
  }
  return children
}
