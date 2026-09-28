import { supabase } from './supabaseClient'

// PostgREST returns at most 1000 rows per request, so reads are paged.
export const PAGE_SIZE = 1000

export class DbError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'DbError'
    this.cause = cause
  }
}

export function friendlyMessage(error) {
  if (!error) return 'Something went wrong.'
  const msg = error.message || String(error)
  if (error.code === 'PGRST301' || /jwt|not authenticated|invalid claim/i.test(msg)) {
    return 'Your session expired. Sign out and sign in again.'
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return "Can't reach the server. Check your connection."
  }
  if (error.code === '42501' || /row-level security/i.test(msg)) {
    return "That change wasn't allowed."
  }
  return msg
}

function fail(error) {
  throw new DbError(friendlyMessage(error), error)
}

export async function fetchAll(table, { orderBy, ascending = true, nullsFirst = false } = {}, client = supabase) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client.from(table).select('*')
    if (orderBy) query = query.order(orderBy, { ascending, nullsFirst })
    query = query.order('id') // stable order across pages
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) fail(error)
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

export async function insertRow(table, values, client = supabase) {
  const { data, error } = await client.from(table).insert(values).select().single()
  if (error) fail(error)
  return data
}

// RLS silently filters rows the user can't touch, so an update or delete that
// matches nothing is reported as an error instead of a fake success.
export async function updateRow(table, id, patch, client = supabase) {
  const { data, error } = await client.from(table).update(patch).eq('id', id).select('id')
  if (error) fail(error)
  if (!data || data.length === 0) fail({ message: "That item couldn't be found. It may have been deleted." })
}

export async function deleteRow(table, id, client = supabase) {
  const { data, error } = await client.from(table).delete().eq('id', id).select('id')
  if (error) fail(error)
  if (!data || data.length === 0) fail({ message: "That item couldn't be found. It may have been deleted." })
}
