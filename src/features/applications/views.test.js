import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, applyView, legacyToConfig, nextSort, normalizeConfig, sameConfig } from './views'

const rows = [
  { id: 1, company: 'beta', status: 'offer', date_applied: '2026-09-10', follow_up_date: null, cover_letter_link: 'x' },
  { id: 2, company: 'Alpha', status: 'applied', date_applied: '2026-09-20', follow_up_date: '2026-10-01', cover_letter_link: '' },
  { id: 3, company: '', status: null, date_applied: null, follow_up_date: '2026-09-01', cover_letter_link: null },
  { id: 4, company: 'gamma', status: 'rejected', date_applied: '2026-08-01', follow_up_date: null },
]
const ids = list => list.map(r => r.id)
const cfg = extra => normalizeConfig({ ...DEFAULT_CONFIG, ...extra })

describe('normalizeConfig', () => {
  it('fills missing columns, drops unknown ones and bad filters', () => {
    const c = normalizeConfig({ columns: [{ key: 'status', visible: true }, { key: 'nope' }], filters: [{ key: 'company', op: 'bogus' }], sort: { key: 'x', dir: 'asc' } })
    expect(c.columns[0]).toEqual({ key: 'status', visible: true })
    expect(c.columns).toHaveLength(DEFAULT_CONFIG.columns.length)
    expect(c.filters).toEqual([])
    expect(c.sort).toBeNull()
  })
})

describe('sorting', () => {
  it('sorts text case-insensitively with empties last, both directions', () => {
    expect(ids(applyView(rows, cfg({ sort: { key: 'company', dir: 'asc' } })))).toEqual([2, 1, 4, 3])
    expect(ids(applyView(rows, cfg({ sort: { key: 'company', dir: 'desc' } })))).toEqual([4, 1, 2, 3])
  })
  it('sorts dates with empties last', () => {
    expect(ids(applyView(rows, cfg({ sort: { key: 'date_applied', dir: 'desc' } })))).toEqual([2, 1, 4, 3])
  })
  it('sorts statuses by pipeline order, blank counting as applied', () => {
    expect(ids(applyView(rows, cfg({ sort: { key: 'status', dir: 'asc' } })))).toEqual([2, 3, 1, 4])
  })
  it('cycles asc, desc, off', () => {
    expect(nextSort(null, 'company')).toEqual({ key: 'company', dir: 'asc' })
    expect(nextSort({ key: 'company', dir: 'asc' }, 'company')).toEqual({ key: 'company', dir: 'desc' })
    expect(nextSort({ key: 'company', dir: 'desc' }, 'company')).toBeNull()
  })
})

describe('filters', () => {
  const f = (key, op, value) => cfg({ filters: [{ key, op, value }] })
  it('text contains / empty', () => {
    expect(ids(applyView(rows, f('company', 'contains', 'AL')))).toEqual([2])
    expect(ids(applyView(rows, f('company', 'empty')))).toEqual([3])
  })
  it('select any / none', () => {
    expect(ids(applyView(rows, f('status', 'any', ['applied'])))).toEqual([2, 3])
    expect(ids(applyView(rows, f('status', 'none', ['rejected', 'offer'])))).toEqual([2, 3])
  })
  it('dates before / after / empty', () => {
    expect(ids(applyView(rows, f('date_applied', 'after', '2026-09-01')))).toEqual([1, 2])
    expect(ids(applyView(rows, f('follow_up_date', 'before', '2026-09-15')))).toEqual([3])
    expect(ids(applyView(rows, f('follow_up_date', 'empty')))).toEqual([1, 4])
  })
  it('cover letter added / missing', () => {
    expect(ids(applyView(rows, f('letter', 'not_empty')))).toEqual([1])
  })
  it('all conditions must match; incomplete ones are ignored', () => {
    const c = cfg({ filters: [{ key: 'status', op: 'none', value: ['rejected'] }, { key: 'company', op: 'contains', value: '' }, { key: 'date_applied', op: 'before', value: '2026-09-15' }] })
    expect(ids(applyView(rows, c))).toEqual([1])
  })
})

describe('legacy settings', () => {
  it('converts old column order, hidden columns and filters', () => {
    const c = legacyToConfig({ order: ['status', 'company'], hidden: ['company'], filters: { company: 'acme', status: ['applied', 'offer'], priority: ['high', 'medium', 'low'] } })
    expect(c.columns.slice(0, 2)).toEqual([{ key: 'status', visible: true }, { key: 'company', visible: false }])
    expect(c.filters.map(x => [x.key, x.op, x.value])).toEqual([['company', 'contains', 'acme'], ['status', 'any', ['applied', 'offer']]])
  })
  it('compares configs regardless of filter ids', () => {
    expect(sameConfig(DEFAULT_CONFIG, normalizeConfig({}))).toBe(true)
  })
})
