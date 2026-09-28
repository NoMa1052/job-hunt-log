import { describe, expect, it } from 'vitest'
import { CYCLE_MS, SKIP_MS, exitDelay } from './loading'

describe('exitDelay', () => {
  it('skips the screen when data arrives quickly', () => {
    expect(exitDelay(0)).toBeNull()
    expect(exitDelay(SKIP_MS - 1)).toBeNull()
  })

  it('finishes the current cycle', () => {
    expect(exitDelay(SKIP_MS)).toBe(0)
    expect(exitDelay(SKIP_MS + 100)).toBe(CYCLE_MS - 100)
    expect(exitDelay(SKIP_MS + CYCLE_MS + 400)).toBe(CYCLE_MS - 400)
  })

  it('never waits a full cycle or more', () => {
    for (let t = SKIP_MS; t < SKIP_MS + 3 * CYCLE_MS; t += 37) {
      expect(exitDelay(t)).toBeLessThan(CYCLE_MS)
    }
  })

  it('leaves right away with reduced motion', () => {
    expect(exitDelay(SKIP_MS + 100, { reducedMotion: true })).toBe(0)
    expect(exitDelay(100, { reducedMotion: true })).toBeNull()
  })
})
