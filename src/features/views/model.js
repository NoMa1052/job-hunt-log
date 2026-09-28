// Table views: which columns show and in what order, the sort, and the
// filters. createViewModel builds the pure helpers for one table from its
// column definitions; saved views persist `config`.
//
// Column: { key, label, type: 'text' | 'select' | 'date' | 'number' | 'icon',
//   field?: row property (defaults to key), options?/fallback? for selects }

export const VIEW_VERSION = 1

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
  number: [
    { op: 'at_least', label: 'is at least', needs: 'number' },
    { op: 'at_most', label: 'is at most', needs: 'number' },
  ],
  icon: [
    { op: 'not_empty', label: 'is added' },
    { op: 'empty', label: 'is missing' },
  ],
}

const newId = () => Math.random().toString(36).slice(2, 10)
const isEmpty = v => v === null || v === undefined || String(v).trim() === ''

export function nextSort(sort, key) {
  if (!sort || sort.key !== key) return { key, dir: 'asc' }
  if (sort.dir === 'asc') return { key, dir: 'desc' }
  return null
}

export function createViewModel({ columns: allColumns, defaultOrder = allColumns.map(c => c.key), defaultHidden = [] }) {
  const DEFAULT_CONFIG = Object.freeze({
    v: VIEW_VERSION,
    columns: defaultOrder.map(key => ({ key, visible: !defaultHidden.includes(key) })),
    sort: null,
    filters: [],
  })

  const column = key => allColumns.find(c => c.key === key)
  const valueOf = (row, col) => {
    const raw = row[col.field || col.key]
    return col.type === 'select' ? raw || col.fallback : raw
  }

  function operatorsFor(key) {
    const col = column(key)
    return col ? OPERATORS[col.type] || [] : []
  }

  function newFilter(key) {
    const [first] = operatorsFor(key)
    return { id: newId(), key, op: first.op, value: first.needs === 'options' ? [] : '' }
  }

  // Bring any stored config up to date: known columns only, every column
  // present once, filters on known columns with known operators.
  function normalizeConfig(config) {
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
    ).map(f => ({ id: f.id || newId(), key: f.key, op: f.op, value: f.value ?? '' }))
    return { v: VIEW_VERSION, columns, sort, filters }
  }

  function matches(row, f) {
    const col = column(f.key)
    const value = valueOf(row, col)
    const empty = isEmpty(value)
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
      case 'at_least': return isEmpty(f.value) || Number(value || 0) >= Number(f.value)
      case 'at_most': return isEmpty(f.value) || Number(value || 0) <= Number(f.value)
      default: return true
    }
  }

  function compare(a, b, col) {
    const va = valueOf(a, col)
    const vb = valueOf(b, col)
    if (col.type === 'select') {
      const idx = v => col.options.findIndex(o => o.value === v)
      return idx(va) - idx(vb)
    }
    if (col.type === 'number') return Number(va || 0) - Number(vb || 0)
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true })
  }

  // Filter (all conditions must match), then sort. Unsorted keeps load order.
  function applyView(rows, config) {
    const filtered = rows.filter(r => config.filters.every(f => matches(r, f)))
    if (!config.sort) return filtered
    const col = column(config.sort.key)
    const dir = config.sort.dir === 'desc' ? -1 : 1
    // Empty values stay last in both directions (numbers count 0 as a value);
    // ties keep load order.
    const emptyRank = row => (col.type === 'select' || col.type === 'number' || !isEmpty(valueOf(row, col)) ? 0 : 1)
    return filtered
      .map((row, i) => ({ row, i }))
      .sort((x, y) => emptyRank(x.row) - emptyRank(y.row) || (emptyRank(x.row) ? 0 : compare(x.row, y.row, col) * dir) || x.i - y.i)
      .map(x => x.row)
  }

  const sameConfig = (a, b) => JSON.stringify(normalizeConfig(a)) === JSON.stringify(normalizeConfig(b))

  return { columns: allColumns, DEFAULT_CONFIG, column, operatorsFor, newFilter, normalizeConfig, applyView, sameConfig }
}
