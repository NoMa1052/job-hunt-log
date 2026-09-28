import { describe, expect, it } from 'vitest'
import { companyKey, sameCompany } from './match'

describe('company matching', () => {
  it('ignores case and extra spaces', () => {
    expect(companyKey('  ACME   corp ')).toBe('acme corp')
    expect(sameCompany('Acme Corp', '  acme  CORP')).toBe(true)
  })
  it("doesn't match different names or blanks", () => {
    expect(sameCompany('Acme', 'Acme Inc')).toBe(false)
    expect(sameCompany('', '')).toBe(false)
    expect(sameCompany(null, undefined)).toBe(false)
  })
})
