// Table views for Applications (see features/views/model.js).
import { createViewModel } from '../views/model'
import { ALL_COLUMNS, DEFAULT_HIDDEN, DEFAULT_ORDER } from './options'

export { OPERATORS, VIEW_VERSION, nextSort } from '../views/model'

export const applicationsModel = createViewModel({ columns: ALL_COLUMNS, defaultOrder: DEFAULT_ORDER, defaultHidden: DEFAULT_HIDDEN })
export const { DEFAULT_CONFIG, column, operatorsFor, newFilter, normalizeConfig, applyView, sameConfig } = applicationsModel

// Convert the pre-views browser settings (column order, hidden columns,
// per-column filters) into a view config.
export function legacyToConfig({ order, hidden, filters }) {
  const hiddenSet = new Set(Array.isArray(hidden) ? hidden : DEFAULT_HIDDEN)
  const columns = (Array.isArray(order) ? order : DEFAULT_ORDER).map(key => ({ key, visible: !hiddenSet.has(key) }))
  const converted = []
  for (const [key, value] of Object.entries(filters || {})) {
    const col = column(key)
    if (!col) continue
    if (col.type === 'text' && typeof value === 'string' && value.trim()) converted.push({ key, op: 'contains', value: value.trim() })
    if (col.type === 'select' && Array.isArray(value) && value.length < col.options.length) converted.push({ key, op: 'any', value })
  }
  return normalizeConfig({ columns, sort: null, filters: converted })
}
