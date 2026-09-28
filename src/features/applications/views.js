// Table views for Applications: which columns show and in what order, the
// sort, and the filters. Pure functions; saved views persist `config`.
import { ALL_COLUMNS, DEFAULT_HIDDEN, DEFAULT_ORDER } from './options'

export const VIEW_VERSION = 1

export const DEFAULT_CONFIG = Object.freeze({
  v: VIEW_VERSION,
  columns: DEFAULT_ORDER.map(key => ({ key, visible: !DEFAULT_HIDDEN.includes(key) })),
  sort: null,
  filters: [],
})

export const column = key => ALL_COLUMNS.find(c => c.key === key)
const valueOf = (row, col) => row[col.field || col.key]

// Operators offered per column type.
export const OPERATORS = {
  text: [
    { op: 'contains', label: 'contains', needs: 'text' },
    { op: 'not_contains', label: 'does not contain', needs: 'text' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  select: [
    { op: 'any', label: 'is any of', needs: 'options' },
    { op: 'none', label: 'is none of', needs: 'options' },
  ],
  date: [
    { op: 'before', label: 'is before', needs: 'date' },
    { op: 'after', label: 'is after', needs: 'date' },
    { op: 'on', label: 'is on', needs: 'date' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  icon: [
    { op: 'not_empty', label: 'is added' },
    { op: 'empty', label: 'is missing' },
  ],
}

export function operatorsFor(key) {
  const col = column(key)
  return col ? OPERATORS[col.type] || [] : []
}

export function newFilter(key) {
  const [first] = operatorsFor(key)
  return { id: Math.random().toString(36).slice(2, 10), key, op: first.op, value: first.needs === 'options' ? [] : '' }
}

// Bring any stored config up to date: known columns only, every column
// present once, filters on known columns with known operators.
export function normalizeConfig(config) {
  const c = config && typeof config === 'object' ? config : {}
  const seen = new Set()
  const columns = []
  for (const item of Array.isArray(c.columns) ? c.columns : []) {
    if (item && column(item.key) && !seen.has(item.key)) {
      seen.add(item.key)
      columns.push({ key: item.key, visible: item.visible !== false })
    }
  }
  for (const def of DEFAULT_CONFIG.columns) if (!seen.has(def.key)) columns.push({ ...def })
  const sort = c.sort && column(c.sort.key) && (c.sort.dir === 'asc' || c.sort.dir === 'desc') ? { key: c.sort.key, dir: c.sort.dir } : null
  const filters = (Array.isArray(c.filters) ? c.filters : []).filter(f =>
    f && operatorsFor(f.key).some(o => o.op === f.op)
  ).map(f => ({ id: f.id || Math.random().toString(36).slice(2, 10), key: f.key, op: f.op, value: f.value ?? '' }))
  return { v: VIEW_VERSION, columns, sort, filters }
}

function matches(row, f) {
  const col = column(f.key)
  const raw = valueOf(row, col)
  const value = col.type === 'select' ? raw || col.fallback : raw
  const empty = value === null || value === undefined || String(value).trim() === ''
  switch (f.op) {
    case 'empty': return empty
    case 'not_empty': return !empty
    case 'contains': return !f.value || String(value || '').toLowerCase().includes(String(f.value).toLowerCase())
    case 'not_contains': return !f.value || !String(value || '').toLowerCase().includes(String(f.value).toLowerCase())
    case 'any': return !f.value?.length || f.value.includes(value)
    case 'none': return !f.value?.length || !f.value.includes(value)
    case 'before': return !f.value || (!empty && value < f.value)
    case 'after': return !f.value || (!empty && value > f.value)
    case 'on': return !f.value || value === f.value
    default: return true
  }
}

function compare(a, b, col) {
  const va = valueOf(a, col)
  const vb = valueOf(b, col)
  if (col.type === 'select') {
    const idx = v => col.options.findIndex(o => o.value === (v || col.fallback))
    return idx(va) - idx(vb)
  }
  const ea = va === null || va === undefined || va === ''
  const eb = vb === null || vb === undefined || vb === ''
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1 // empties last
  return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true })
}

// Filter (all conditions must match), then sort. Unsorted keeps load order.
export function applyView(rows, config) {
  const filtered = rows.filter(r => config.filters.every(f => matches(r, f)))
  if (!config.sort) return filtered
  const col = column(config.sort.key)
  const dir = config.sort.dir === 'desc' ? -1 : 1
  return filtered
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      const c = compare(x.row, y.row, col)
      // Empty values stay last in both directions; ties keep load order.
      const ex = valueOf(x.row, col) ? 0 : 1
      const ey = valueOf(y.row, col) ? 0 : 1
      if (col.type !== 'select' && ex !== ey) return ex - ey
      return c * dir || x.i - y.i
    })
    .map(x => x.row)
}

export function nextSort(sort, key) {
  if (!sort || sort.key !== key) return { key, dir: 'asc' }
  if (sort.dir === 'asc') return { key, dir: 'desc' }
  return null
}

export const sameConfig = (a, b) => JSON.stringify(normalizeConfig(a)) === JSON.stringify(normalizeConfig(b))

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
