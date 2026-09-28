export const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', cls: 'st-applied' },
  { value: 'screen', label: 'Phone screen', cls: 'st-screen' },
  { value: 'interview', label: 'Interviewing', cls: 'st-interview' },
  { value: 'offer', label: 'Offer', cls: 'st-offer' },
  { value: 'rejected', label: 'Rejected', cls: 'st-rejected' },
  { value: 'withdrawn', label: 'Withdrawn', cls: 'st-withdrawn' }
]

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', cls: 'pr-high' },
  { value: 'medium', label: 'Medium', cls: 'pr-medium' },
  { value: 'low', label: 'Low', cls: 'pr-low' }
]

export const ALL_COLUMNS = [
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'position', label: 'Position', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'date_applied', label: 'Applied', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'salary', label: 'Salary', type: 'text' },
  { key: 'follow_up_date', label: 'Follow-up', type: 'date' },
  { key: 'interview_date', label: 'Interview', type: 'date' },
  { key: 'hiring_manager', label: 'Hiring mgr', type: 'text' },
  { key: 'connections', label: 'Connections', type: 'text' },
  { key: 'letter', label: 'Letter', type: 'icon' }
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

export function optionClass(list, value, fallback) {
  const m = list.find(s => s.value === value)
  return m ? m.cls : fallback
}

export function statusCounts(applications) {
  const counts = { applied: 0, screen: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 }
  applications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
  return counts
}

export function passesFilters(app, filters) {
  for (const col of ALL_COLUMNS) {
    if (col.type === 'text') {
      const f = (filters[col.key] || '').trim().toLowerCase()
      if (f && !(app[col.key] || '').toString().toLowerCase().includes(f)) return false
    } else if (col.type === 'select') {
      const allowed = filters[col.key]
      if (allowed && allowed.length < col.options.length) {
        const val = app[col.key] || col.options[0].value
        if (!allowed.includes(val)) return false
      }
    }
  }
  return true
}

export function hasActiveFilter(col, filters) {
  if (col.type === 'text') return !!(filters[col.key] && filters[col.key].trim())
  if (col.type === 'select') return !!(filters[col.key] && filters[col.key].length < col.options.length)
  return false
}
