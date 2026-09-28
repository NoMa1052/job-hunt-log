/* eslint-disable react-refresh/only-export-components -- the provider and its hook belong together */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DbError, friendlyMessage, isMissing, upsertRow } from '../lib/db'
import { joinName, splitName } from '../lib/initials'
import { useData } from './DataProvider'

export const EMPTY_PROFILE = Object.freeze({
  first_name: '',
  last_name: '',
  full_name: '',
  target_roles: [],
  location: '',
  bio: '',
  default_view_id: null,
  date_format: 'month_day',
})

// Profiles saved before first and last name existed only have full_name.
function fromRow(row) {
  const p = { ...EMPTY_PROFILE, ...row }
  if (row && row.first_name === undefined) {
    const { first, last } = splitName(row.full_name)
    p.first_name = first
    p.last_name = last
  }
  return p
}

const ProfileContext = createContext({ profile: EMPTY_PROFILE, status: 'ready', save: async () => false })

// The signed-in user's profile row (created on first save).
export function ProfileProvider({ children }) {
  const { userId, track } = useData()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [status, setStatus] = useState('loading') // loading | ready | unavailable | error

  useEffect(() => {
    let cancelled = false
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        const e = new DbError(friendlyMessage(error), error)
        setStatus(isMissing(e) ? 'unavailable' : 'error')
        return
      }
      if (data) setProfile(fromRow(data))
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [userId])

  const save = useCallback(async patch => {
    const next = { ...profile, ...patch }
    const before = profile
    setProfile(next)
    const row = {
      user_id: userId,
      first_name: next.first_name,
      last_name: next.last_name,
      full_name: joinName(next.first_name, next.last_name), // kept for older clients
      target_roles: next.target_roles,
      location: next.location,
      bio: next.bio,
      default_view_id: next.default_view_id,
      date_format: next.date_format,
    }
    const { ok, result } = await track(upsertRow('profiles', row, 'user_id').catch(e => {
      // Before the first/last name migration: save the joined name only.
      if (!isMissing(e)) throw e
      const { first_name: _f, last_name: _l, ...legacy } = row
      return upsertRow('profiles', legacy, 'user_id')
    }))
    if (!ok) { setProfile(before); return false }
    setProfile(fromRow(result))
    return true
  }, [profile, track, userId])

  const value = useMemo(() => ({ profile, status, save }), [profile, status, save])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfile = () => useContext(ProfileContext)
