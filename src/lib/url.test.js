import { describe, expect, it } from 'vitest'
import { safeUrl } from './url'

describe('safeUrl', () => {
  it('keeps http and https links', () => {
    expect(safeUrl('https://example.com/jobs/1')).toBe('https://example.com/jobs/1')
    expect(safeUrl('http://example.com')).toBe('http://example.com/')
  })
  it('adds https to bare domains', () => {
    expect(safeUrl('example.com/careers')).toBe('https://example.com/careers')
    expect(safeUrl('  docs.google.com/d/abc  ')).toBe('https://docs.google.com/d/abc')
  })
  it('rejects scripts and other schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('JavaScript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull()
  })
  it('returns null for empty values', () => {
    expect(safeUrl('')).toBeNull()
    expect(safeUrl(null)).toBeNull()
    expect(safeUrl(undefined)).toBeNull()
  })
})
