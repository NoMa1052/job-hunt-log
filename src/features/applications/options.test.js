import { describe, expect, it } from 'vitest'
import { passesFilters, statusCounts } from './options'

describe('application filters', () => {
  const app = { company: 'Acme Corp', position: 'Analyst', status: 'interview', priority: null }

  it('matches text filters case-insensitively', () => {
    expect(passesFilters(app, { company: 'acme' })).toBe(true)
    expect(passesFilters(app, { company: 'globex' })).toBe(false)
    expect(passesFilters(app, { company: '   ' })).toBe(true)
  })

  it('treats select filters as the allowed set', () => {
    expect(passesFilters(app, { status: ['interview', 'offer'] })).toBe(true)
    expect(passesFilters(app, { status: ['applied'] })).toBe(false)
  })

  it('filters empty select values by the same default the table shows', () => {
    // priority is null, which the table displays as Medium
    expect(passesFilters(app, { priority: ['medium'] })).toBe(true)
    expect(passesFilters(app, { priority: ['high'] })).toBe(false)
  })

  it('counts statuses', () => {
    const counts = statusCounts([{ status: 'applied' }, { status: 'offer' }, { status: 'offer' }, { status: 'bogus' }])
    expect(counts).toMatchObject({ applied: 1, offer: 2, rejected: 0 })
  })
})
