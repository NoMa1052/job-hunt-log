import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteRow, fetchAll, insertRow, isMissing, updateRow } from '../lib/db'
import { clearPref, loadPref } from '../lib/storage'
import { useData } from './DataProvider'

const LEGACY_KEYS = ['col-order', 'hidden-cols', 'col-filters']
const SAVE_DELAY_MS = 600

// Saved views for one table, synced through Supabase. `toConfig` turns the
// old browser settings into a view config for the one-time import.
export default function useTableViews(tableName, { legacyToConfig } = {}) {
  const { userId, track } = useData()
  const [views, setViews] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | unavailable | error
  const timers = useRef({})
  const importedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchAll('table_views', { orderBy: 'position' })
      .then(rows => {
        if (cancelled) return
        setViews(rows.filter(r => r.table_name === tableName))
        setStatus('ready')
      })
      .catch(e => { if (!cancelled) setStatus(isMissing(e) ? 'unavailable' : 'error') })
    return () => { cancelled = true }
  }, [tableName])

  const create = useCallback(async (name, config) => {
    const position = views.reduce((m, v) => Math.max(m, v.position), -1) + 1
    const { ok, result } = await track(insertRow('table_views', { table_name: tableName, name: name.trim(), position, config }))
    if (!ok) return null
    setViews(prev => [...prev, result])
    return result
  }, [views, track, tableName])

  const rename = useCallback(async (id, name) => {
    const before = views.find(v => v.id === id)
    setViews(prev => prev.map(v => (v.id === id ? { ...v, name: name.trim() } : v)))
    const { ok } = await track(updateRow('table_views', id, { name: name.trim() }))
    if (!ok && before) setViews(prev => prev.map(v => (v.id === id ? before : v)))
  }, [views, track])

  const remove = useCallback(async id => {
    const before = views
    setViews(prev => prev.filter(v => v.id !== id))
    const { ok } = await track(deleteRow('table_views', id))
    if (!ok) setViews(before)
  }, [views, track])

  // Config edits apply instantly and save shortly after the last change.
  const saveConfig = useCallback((id, config) => {
    setViews(prev => prev.map(v => (v.id === id ? { ...v, config } : v)))
    clearTimeout(timers.current[id]?.timer)
    const run = () => { delete timers.current[id]; track(updateRow('table_views', id, { config })) }
    timers.current[id] = { run, timer: setTimeout(run, SAVE_DELAY_MS) }
  }, [track])

  // Save anything still waiting when leaving the page.
  useEffect(() => () => {
    Object.values(timers.current).forEach(({ run, timer }) => { clearTimeout(timer); run() })
  }, [])

  // One-time import of the old per-browser column settings into a saved view.
  useEffect(() => {
    if (status !== 'ready' || importedRef.current || !legacyToConfig) return
    importedRef.current = true
    const legacy = Object.fromEntries(LEGACY_KEYS.map(k => [k, loadPref(userId, k, null)]))
    if (Object.values(legacy).every(v => v === null)) return
    const done = () => LEGACY_KEYS.forEach(k => clearPref(userId, k))
    if (views.length > 0) { done(); return }
    create('My view', legacyToConfig({ order: legacy['col-order'], hidden: legacy['hidden-cols'], filters: legacy['col-filters'] }))
      .then(row => { if (row) done() })
  }, [status, views.length, userId, create, legacyToConfig])

  return { views, status, create, rename, remove, saveConfig }
}
