/* eslint-disable react-refresh/only-export-components -- the provider, its hook and its collection map belong together */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAll, insertRow, updateRow, deleteRow } from '../lib/db'

// Each collection the app keeps in memory, the table it comes from and how it's sorted.
export const COLLECTIONS = {
  applications: { table: 'applications', orderBy: 'date_applied', ascending: false },
  people: { table: 'people', orderBy: 'name' },
  entries: { table: 'conversation_entries', orderBy: 'date', ascending: false },
  companies: { table: 'companies', orderBy: 'created_at', ascending: false },
  companyNotes: { table: 'company_notes', orderBy: 'created_at', ascending: false },
}

// Deleting a parent also deletes its children in the database (on delete cascade).
const CHILDREN = {
  people: { collection: 'entries', key: 'person_id' },
  companies: { collection: 'companyNotes', key: 'company_id' },
}

const initialState = () => Object.fromEntries(
  Object.keys(COLLECTIONS).map(name => [name, { rows: [], status: 'loading', error: '' }])
)

const DataContext = createContext(null)

// Mount with key={userId}: signing out or switching accounts remounts the
// provider, which drops every row the previous user loaded.
export function DataProvider({ userId, children }) {
  const [data, setData] = useState(initialState)
  const [pending, setPending] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [savedOnce, setSavedOnce] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  const setCollection = useCallback((name, fn) => {
    setData(prev => ({ ...prev, [name]: { ...prev[name], ...fn(prev[name]) } }))
  }, [])

  const reload = useCallback(async (name) => {
    setCollection(name, () => ({ status: 'loading', error: '' }))
    try {
      const rows = await fetchAll(COLLECTIONS[name].table, COLLECTIONS[name])
      setCollection(name, () => ({ rows, status: 'ready', error: '' }))
    } catch (e) {
      setCollection(name, () => ({ status: 'error', error: e.message }))
    }
  }, [setCollection])

  const reloadAll = useCallback(() => {
    setSaveError('')
    return Promise.all(Object.keys(COLLECTIONS).map(reload))
  }, [reload])

  useEffect(() => { reloadAll() }, [reloadAll])

  const track = useCallback(async (promise) => {
    setPending(n => n + 1)
    try {
      const result = await promise
      setSaveError('')
      setSavedOnce(true)
      return { ok: true, result }
    } catch (e) {
      setSaveError(e.message)
      return { ok: false }
    } finally {
      setPending(n => n - 1)
    }
  }, [])

  const add = useCallback(async (name, values) => {
    const { ok, result } = await track(insertRow(COLLECTIONS[name].table, values))
    if (!ok) return null
    setCollection(name, c => ({ rows: [result, ...c.rows] }))
    return result
  }, [track, setCollection])

  const update = useCallback(async (name, id, field, value) => {
    const row = dataRef.current[name].rows.find(r => r.id === id)
    if (!row || row[field] === value || ((row[field] ?? '') === '' && value === '')) return
    const previous = row[field]
    const patchRow = v => c => ({ rows: c.rows.map(r => (r.id === id ? { ...r, [field]: v } : r)) })
    setCollection(name, patchRow(value))
    const { ok } = await track(updateRow(COLLECTIONS[name].table, id, { [field]: value }))
    if (!ok) setCollection(name, patchRow(previous))
  }, [track, setCollection])

  const remove = useCallback(async (name, id) => {
    const child = CHILDREN[name]
    setCollection(name, c => ({ rows: c.rows.filter(r => r.id !== id) }))
    if (child) setCollection(child.collection, c => ({ rows: c.rows.filter(r => r[child.key] !== id) }))
    const { ok } = await track(deleteRow(COLLECTIONS[name].table, id))
    if (!ok) {
      reload(name)
      if (child) reload(child.collection)
    }
  }, [track, setCollection, reload])

  const value = useMemo(() => ({
    userId,
    data,
    reload,
    reloadAll,
    add,
    update,
    remove,
    save: { pending, error: saveError, savedOnce, dismiss: () => setSaveError('') },
  }), [userId, data, reload, reloadAll, add, update, remove, pending, saveError, savedOnce])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
