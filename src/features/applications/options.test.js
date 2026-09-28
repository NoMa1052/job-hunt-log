import { describe, expect, it } from 'vitest'
import { followUp, followUpsDue, statusChip, statusCounts } from './options'

describe('status counts', () => {
  it('counts statuses', () => {
    const counts = statusCounts([{ status: 'applied' }, { status: 'offer' }, { status: 'offer' }, { status: 'bogus' }])
    expect(counts).toMatchObject({ applied: 1, offer: 2, rejected: 0 })
  })
})

describe('status chips', () => {
  it('maps every stored status to a chip style', () => {
    expect(statusChip('applied')).toEqual({ kind: 'applied', label: 'Applied' })
    expect(statusChip('screen')).toEqual({ kind: 'interviewing', label: 'Phone screen' })
    expect(statusChip('interview')).toEqual({ kind: 'interviewing', label: 'Interviewing' })
    expect(statusChip('offer')).toEqual({ kind: 'offer', label: 'Offer' })
    expect(statusChip('rejected')).toEqual({ kind: 'rejected', label: 'Rejected' })
    expect(statusChip('withdrawn')).toEqual({ kind: 'closed', label: 'Withdrawn' })
    expect(statusChip(null)).toEqual({ kind: 'applied', label: 'Applied' })
  })
})

describe('follow-up column', () => {
  const today = '2026-09-28'
  const app = (follow_up_date, status = 'applied') => ({ follow_up_date, status })

  it('flags overdue dates with how late they are', () => {
    expect(followUp(app('2026-09-25'), today)).toEqual({ state: 'overdue', text: 'Follow up, 3 days late' })
    expect(followUp(app('2026-09-27'), today)).toEqual({ state: 'overdue', text: 'Follow up, 1 day late' })
  })
  it('flags today', () => {
    expect(followUp(app('2026-09-28'), today)).toEqual({ state: 'due', text: 'Follow up today' })
  })
  it('shows upcoming dates', () => {
    expect(followUp(app('2026-10-02'), today)).toEqual({ state: 'upcoming', text: 'Oct 2' })
  })
  it('asks for a date when there is none', () => {
    expect(followUp(app(null), today)).toEqual({ state: 'none', text: 'Set a date' })
  })
  it('stops for rejected and withdrawn applications', () => {
    expect(followUp(app('2026-09-01', 'rejected'), today)).toEqual({ state: 'none', text: 'No follow-up' })
    expect(followUp(app(null, 'withdrawn'), today)).toEqual({ state: 'none', text: 'No follow-up' })
  })
  it('counts only due and overdue follow-ups', () => {
    const apps = [app('2026-09-20'), app('2026-09-28'), app('2026-10-05'), app(null), app('2026-09-01', 'rejected')]
    expect(followUpsDue(apps, today)).toBe(2)
  })
})
