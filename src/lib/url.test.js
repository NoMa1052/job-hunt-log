import { describe, expect, it } from 'vitest'
import { mailtoUrl, safeUrl, telUrl, webUrl } from './url'

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

describe('webUrl', () => {
  it('accepts sites with or without a scheme', () => {
    expect(webUrl('linkedin.com/in/sam')).toBe('https://linkedin.com/in/sam')
    expect(webUrl('https://www.linkedin.com/in/sam')).toBe('https://www.linkedin.com/in/sam')
  })
  it('ignores plain words and unsafe schemes', () => {
    expect(webUrl('Slack')).toBeNull()
    expect(webUrl('javascript:alert(1)')).toBeNull()
    expect(webUrl('')).toBeNull()
  })
})

describe('mailtoUrl', () => {
  it('builds a mailto link from an address', () => {
    expect(mailtoUrl(' sam@acme.com ')).toBe('mailto:sam@acme.com')
    expect(mailtoUrl('sam.lee+jobs@mail.acme.co.uk')).toBe('mailto:sam.lee+jobs@mail.acme.co.uk')
  })
  it('rejects anything that is not a single plain address', () => {
    expect(mailtoUrl('sam')).toBeNull()
    expect(mailtoUrl('sam@acme')).toBeNull()
    expect(mailtoUrl('sam@acme.com?bcc=x@y.com')).toBeNull()
    expect(mailtoUrl('a@b.com, c@d.com')).toBeNull()
    expect(mailtoUrl('javascript:alert(1)//@x.com')).toBeNull()
    expect(mailtoUrl('')).toBeNull()
  })
})

describe('telUrl', () => {
  it('keeps only digits and a leading +', () => {
    expect(telUrl('(555) 123-4567')).toBe('tel:5551234567')
    expect(telUrl('+44 20 7946 0958')).toBe('tel:+442079460958')
  })
  it('rejects text that is not a phone number', () => {
    expect(telUrl('call me')).toBeNull()
    expect(telUrl('12')).toBeNull()
    expect(telUrl('555-1234 ext. 2')).toBeNull()
    expect(telUrl('')).toBeNull()
  })
})
