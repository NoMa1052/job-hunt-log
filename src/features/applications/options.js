import { daysBetween, formatShortDate, todayLocal } from '../../lib/format'

// `chip` is the status chip style each stored status maps to.
export const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', chip: 'applied' },
  { value: 'screen', label: 'Phone screen', chip: 'interviewing' },
  { value: 'interview', label: 'Interviewing', chip: 'interviewing' },
  { value: 'offer', label: 'Offer', chip: 'offer' },
  { value: 'rejected', label: 'Rejected', chip: 'rejected' },
  { value: 'withdrawn', label: 'Withdrawn', chip: 'closed' }
]
const CLOSED_STATUSES = ['rejected', 'withdrawn']

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

export const ALL_COLUMNS = [
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'position', label: 'Position', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'date_applied', label: 'Applied', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, fallback: 'applied' },
  { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS, fallback: 'medium' },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'salary', label: 'Salary', type: 'text' },
  { key: 'follow_up_date', label: 'Follow-up', type: 'date' },
  { key: 'interview_date', label: 'Interview', type: 'date' },
  { key: 'hiring_manager', label: 'Hiring manager', type: 'text' },
  { key: 'connections', label: 'Connections', type: 'text' },
  { key: 'letter', label: 'Cover letter', type: 'icon', field: 'cover_letter_link' }
]
export const DEFAULT_ORDER = ALL_COLUMNS.map(c => c.key)
export const DEFAULT_HIDDEN = ['interview_date', 'hiring_manager', 'connections']

export const EXPORT_HEADERS = [
  { key: 'company', label: 'Company' }, { key: 'position', label: 'Position' },
  { key: 'link', label: 'Application Link' }, { key: 'cover_letter_link', label: 'Cover Letter Link' },
  { key: 'location', label: 'Location' }, { key: 'date_applied', label: 'Date Applied' },
  { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' }, { key: 'salary', label: 'Salary' },
  { key: 'hiring_manager', label: 'Hiring Manager' }, { key: 'connections', label: 'Other Connections' },
  { key: 'next_action', label: 'Next Action' }, { key: 'follow_up_date', label: 'Follow-up Date' },
  { key: 'interview_date', label: 'Interview Date' }, { key: 'notes', label: 'Notes' }
]

export function statusCounts(applications) {
  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  return counts
}

export function statusChip(status) {
  const option = STATUS_OPTIONS.find(o => o.value === (status || 'applied'))
  return option ? { kind: option.chip, label: option.label } : { kind: 'closed', label: status }
}

export function optionLabel(options, value, fallback) {
  return (options.find(o => o.value === (value || fallback)) || {}).label || value || ''
}

// What the follow-up column shows for an application.
export function followUp(app, today = todayLocal()) {
  if (CLOSED_STATUSES.includes(app.status)) return { state: 'none', text: 'No follow-up' }
  if (!app.follow_up_date) return { state: 'none', text: 'Set a date' }
  const late = daysBetween(app.follow_up_date, today)
  if (late > 0) return { state: 'overdue', text: `Follow up, ${late} ${late === 1 ? 'day' : 'days'} late` }
  if (late === 0) return { state: 'due', text: 'Follow up today' }
  return { state: 'upcoming', text: formatShortDate(app.follow_up_date) }
}

export function followUpsDue(applications, today = todayLocal()) {
  return applications.filter(a => {
    const { state } = followUp(a, today)
    return state === 'due' || state === 'overdue'
  }).length
}
