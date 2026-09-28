import { describe, expect, it, vi } from 'vitest'

// db.js imports the real client; stub it so tests never need env vars.
vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { PAGE_SIZE, DbError, deleteRow, fetchAll, friendlyMessage, insertRow, updateRow } = await import('./db')

// Minimal stand-in for the supabase-js query builder: every method chains,
// and awaiting it resolves to respond(calls).
function fakeClient(respond) {
  const log = []
  return {
    log,
    from(table) {
      const calls = [['from', table]]
      log.push(calls)
      const builder = new Proxy({}, {
        get(_t, prop) {
          if (prop === 'then') return (res, rej) => Promise.resolve(respond(calls)).then(res, rej)
          return (...args) => { calls.push([prop, ...args]); return builder }
        },
      })
      return builder
    },
  }
}

const rangeOf = calls => calls.find(c => c[0] === 'range')

describe('fetchAll', () => {
  it('pages past the 1000-row cap and keeps a stable order', async () => {
    const total = PAGE_SIZE + 5
    const client = fakeClient(calls => {
      const [, from, to] = rangeOf(calls)
      const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ id: from + i }))
      return { data: rows, error: null }
    })
    const rows = await fetchAll('applications', { orderBy: 'date_applied', ascending: false }, client)
    expect(rows).toHaveLength(total)
    expect(client.log).toHaveLength(2)
    expect(client.log[0]).toContainEqual(['order', 'date_applied', { ascending: false, nullsFirst: false }])
    expect(client.log[0]).toContainEqual(['order', 'id'])
  })

  it('throws a friendly DbError on failure', async () => {
    const client = fakeClient(() => ({ data: null, error: { message: 'TypeError: Failed to fetch' } }))
    await expect(fetchAll('people', {}, client)).rejects.toBeInstanceOf(DbError)
    await expect(fetchAll('people', {}, client)).rejects.toThrow("Can't reach the server")
  })
})

describe('writes', () => {
  it('returns the inserted row', async () => {
    const client = fakeClient(() => ({ data: { id: 'a1', company: 'Acme' }, error: null }))
    await expect(insertRow('applications', { company: 'Acme' }, client)).resolves.toEqual({ id: 'a1', company: 'Acme' })
  })

  it('reports an update that matched no row instead of pretending it saved', async () => {
    const client = fakeClient(() => ({ data: [], error: null }))
    await expect(updateRow('applications', 'missing', { company: 'x' }, client)).rejects.toThrow("couldn't be found")
  })

  it('reports a delete that matched no row', async () => {
    const client = fakeClient(() => ({ data: [], error: null }))
    await expect(deleteRow('companies', 'missing', client)).rejects.toThrow("couldn't be found")
  })

  it('succeeds when the row was updated', async () => {
    const client = fakeClient(() => ({ data: [{ id: 'a1' }], error: null }))
    await expect(updateRow('applications', 'a1', { company: 'x' }, client)).resolves.toBeUndefined()
    expect(client.log[0]).toContainEqual(['eq', 'id', 'a1'])
  })
})

describe('friendlyMessage', () => {
  it('explains common failures in plain words', () => {
    expect(friendlyMessage({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/session expired/)
    expect(friendlyMessage({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/wasn't allowed/)
    expect(friendlyMessage({ message: 'something else' })).toBe('something else')
  })
})
