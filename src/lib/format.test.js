import { describe, expect, it } from 'vitest'
import { csvEscape, daysBetween, formatShortDate, todayLocal, toCSV } from './format'

describe('todayLocal', () => {
  it('uses the local calendar date, not UTC', () => {
    // 11:30pm local on Jan 31 must stay Jan 31 even where UTC is already Feb 1.
    expect(todayLocal(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31')
    expect(todayLocal(new Date(2026, 8, 5, 0, 5))).toBe('2026-09-05')
  })
})

describe('formatShortDate', () => {
  const now = new Date(2026, 8, 28)
  it('shows month and day, adding the year only for other years', () => {
    expect(formatShortDate('2026-07-27', now)).toBe('Jul 27')
    expect(formatShortDate('2025-12-31', now)).toBe('Dec 31, 2025')
    expect(formatShortDate('', now)).toBe('')
  })
  it('reads YYYY-MM-DD as a local date, not UTC', () => {
    expect(formatShortDate('2026-10-01', now)).toBe('Oct 1')
  })
})

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-09-25', '2026-09-28')).toBe(3)
    expect(daysBetween('2026-09-28', '2026-09-28')).toBe(0)
    expect(daysBetween('2026-10-02', '2026-09-28')).toBe(-4)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2) // across a DST change
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

describe('initialsFor', async () => {
  const { initialsFor } = await import('./initials')
  it('takes two letters from the email name', () => {
    expect(initialsFor('pat.lee@example.com')).toBe('PL')
    expect(initialsFor('nmarx0810@gmail.com')).toBe('NM')
    expect(initialsFor('qa-alice@sidekick-dev.test')).toBe('QA')
    expect(initialsFor('')).toBe('?')
  })
})

describe('date format preference', () => {
  const now = new Date(2026, 8, 28)
  it('formats dates the way the user chose', () => {
    expect(formatShortDate('2026-07-27', now, 'month_day')).toBe('Jul 27')
    expect(formatShortDate('2026-07-27', now, 'day_month')).toBe('27 Jul')
    expect(formatShortDate('2026-07-27', now, 'iso')).toBe('2026-07-27')
    expect(formatShortDate('2025-07-27', now, 'day_month')).toBe('27 Jul 2025')
    expect(formatShortDate('2026-09-28', now, 'day_month')).toBe('28 Sep')
  })
})

describe('name helpers', async () => {
  const { initialsFromParts, joinName, splitName } = await import('./initials')
  it('uses both initials, or one letter when only one name is filled in', () => {
    expect(initialsFromParts('Pat', 'Lee')).toBe('PL')
    expect(initialsFromParts(' mary ', ' ann smith')).toBe('MA')
    expect(initialsFromParts('Madonna', '')).toBe('M')
    expect(initialsFromParts('', 'Lee')).toBe('L')
    expect(initialsFromParts('', '  ')).toBe('')
  })
  it('splits and joins names', () => {
    expect(splitName('  Pat Lee Smith ')).toEqual({ first: 'Pat', last: 'Lee Smith' })
    expect(splitName('Madonna')).toEqual({ first: 'Madonna', last: '' })
    expect(splitName('')).toEqual({ first: '', last: '' })
    expect(joinName(' Pat ', 'Lee')).toBe('Pat Lee')
    expect(joinName('', 'Lee')).toBe('Lee')
  })
})
