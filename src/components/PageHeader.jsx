import { useData } from '../state/DataProvider'
import { followUpsDue, statusCounts } from '../features/applications/options'

// Section heading, the application summary line and the section's actions.
export default function PageHeader({ title, actions }) {
  const { data } = useData()
  const applications = data.applications.rows
  const counts = statusCounts(applications)
  const due = followUpsDue(applications)

  return (
    <div className="page-row">
      <div className="page-heading">
        <h1 className="page-title">{title}</h1>
        <p className="page-summary">
          <span><strong>{applications.length}</strong> applied</span>{' '}
          <span><strong>{counts.screen + counts.interview}</strong> interviewing</span>{' '}
          {due > 0 && (
            <span className="page-summary-due">
              <strong>{due}</strong> {due === 1 ? 'follow-up' : 'follow-ups'} due
              <span className="summary-light" aria-hidden="true" />
            </span>
          )}
        </p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
