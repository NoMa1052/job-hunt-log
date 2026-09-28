import { describe, expect, it } from 'vitest'
import { csvEscape, todayLocal, toCSV } from './format'

describe('todayLocal', () => {
  it('uses the local calendar date, not UTC', () => {
    // 11:30pm local on Jan 31 must stay Jan 31 even where UTC is already Feb 1.
    expect(todayLocal(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31')
    expect(todayLocal(new Date(2026, 8, 5, 0, 5))).toBe('2026-09-05')
  })
})

describe('CSV', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(csvEscape('plain')).toBe('plain')
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
    expect(csvEscape(null)).toBe('')
  })
  it('builds rows from headers, including computed columns', () => {
    const csv = toCSV(
      [{ key: 'company', label: 'Company' }, { key: 'n', label: 'Count', value: r => r.items.length }],
      [{ company: 'Acme, Inc', items: [1, 2] }],
    )
    expect(csv).toBe('Company,Count\n"Acme, Inc",2')
  })
})
