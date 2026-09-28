import { describe, expect, it } from 'vitest'
import { peopleModel, withActivity } from '../conversations/columns'
import { companiesModel, withCounts } from '../companies/columns'

describe('people view', () => {
  const people = withActivity(
    [{ id: 'a', name: 'Sam', company: 'Acme' }, { id: 'b', name: 'Ana', company: 'Globex' }, { id: 'c', name: '', company: '' }],
    [{ person_id: 'a', date: '2026-09-01' }, { person_id: 'a', date: '2026-09-15' }, { person_id: 'b', date: null }],
  )

  it('works out talks and last contact', () => {
    expect(people.map(p => [p.talks, p.last_contact])).toEqual([[2, '2026-09-15'], [1, null], [0, null]])
  })

  it('hides contact columns by default', () => {
    expect(peopleModel.DEFAULT_CONFIG.columns.filter(c => c.visible).map(c => c.key)).toEqual(['name', 'company', 'last_contact', 'talks'])
  })

  it('sorts numbers numerically, zero included', () => {
    const cfg = peopleModel.normalizeConfig({ sort: { key: 'talks', dir: 'desc' } })
    expect(peopleModel.applyView(people, cfg).map(p => p.id)).toEqual(['a', 'b', 'c'])
    expect(peopleModel.applyView(people, { ...cfg, sort: { key: 'talks', dir: 'asc' } }).map(p => p.id)).toEqual(['c', 'b', 'a'])
  })

  it('keeps empty dates last both ways', () => {
    const cfg = peopleModel.normalizeConfig({ sort: { key: 'last_contact', dir: 'asc' } })
    expect(peopleModel.applyView(people, cfg).map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('filters numbers with at least / at most', () => {
    const at = (op, value) => peopleModel.applyView(people, peopleModel.normalizeConfig({ filters: [{ key: 'talks', op, value }] })).map(p => p.id)
    expect(at('at_least', '1')).toEqual(['a', 'b'])
    expect(at('at_most', '0')).toEqual(['c'])
    expect(at('at_least', '')).toEqual(['a', 'b', 'c'])
  })

  it('drops filters and sorts on unknown columns', () => {
    const cfg = peopleModel.normalizeConfig({ sort: { key: 'status', dir: 'asc' }, filters: [{ key: 'status', op: 'any', value: ['applied'] }] })
    expect(cfg.sort).toBeNull()
    expect(cfg.filters).toEqual([])
  })
})

describe('companies view', () => {
  const rows = withCounts(
    [{ id: 'c1', company: 'Acme Corp', careers_link: 'acme.com', last_clicked: '2026-09-20T15:00:00Z' }, { id: 'c2', company: 'Globex', careers_link: '' }],
    {
      applications: [{ company: ' acme  corp' }, { company: 'Acme Corp' }, { company: 'Acme Inc' }],
      people: [{ company: 'ACME CORP' }],
      notes: [{ company_id: 'c2' }],
    },
  )

  it('counts by company name', () => {
    expect(rows.map(r => [r.applied, r.people, r.notes])).toEqual([[2, 1, 0], [0, 0, 1]])
    expect(rows[0].last_opened).toMatch(/^2026-09-2[01]$/)
    expect(rows[1].last_opened).toBeNull()
  })

  it('filters careers link added / missing', () => {
    const cfg = companiesModel.normalizeConfig({ filters: [{ key: 'careers_link', op: 'empty' }] })
    expect(companiesModel.applyView(rows, cfg).map(r => r.id)).toEqual(['c2'])
  })
})
