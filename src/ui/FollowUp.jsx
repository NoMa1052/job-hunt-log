// Follow-up signal: span.sk-followup with an inner light. The only place in
// the app that uses amber.
// state: 'overdue' | 'due' | 'upcoming' | 'none'
export default function FollowUp({ state, children }) {
  return (
    <span className={`sk-followup sk-followup--${state}`}>
      <span className="sk-followup__light" aria-hidden="true" />
      {children}
    </span>
  )
}
