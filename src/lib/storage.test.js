import { beforeEach, describe, expect, it } from 'vitest'
import { loadPref, savePref, storageKey } from './storage'

function memoryStore() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    keys: () => [...m.keys()],
  }
}

describe('per-user preferences', () => {
  let store
  beforeEach(() => { store = memoryStore() })

  it('scopes values to the user', () => {
    savePref('alice', 'col-filters', { company: 'acme' }, store)
    expect(loadPref('alice', 'col-filters', {}, store)).toEqual({ company: 'acme' })
    expect(loadPref('bob', 'col-filters', {}, store)).toEqual({})
  })

  it('uses a brand-neutral key prefix', () => {
    expect(storageKey('u1', 'col-order')).toBe('app:u1:col-order')
  })

  it('migrates the old unscoped jhl-* value once, to the first user only', () => {
    store.setItem('jhl-col-order', JSON.stringify(['company', 'status']))
    expect(loadPref('alice', 'col-order', [], store)).toEqual(['company', 'status'])
    expect(store.getItem('jhl-col-order')).toBeNull()
    expect(loadPref('bob', 'col-order', ['default'], store)).toEqual(['default'])
  })

  it('falls back when storage is corrupt or blocked', () => {
    store.setItem(storageKey('alice', 'x'), '{not json')
    expect(loadPref('alice', 'x', 'fallback', store)).toBe('fallback')
    const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
    expect(loadPref('alice', 'x', 'fallback', blocked)).toBe('fallback')
    expect(() => savePref('alice', 'x', 1, blocked)).not.toThrow()
  })
})
