/* eslint-disable react-refresh/only-export-components -- the provider and its hook belong together */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DbError, friendlyMessage, isMissing, upsertRow } from '../lib/db'
import { useData } from './DataProvider'

export const EMPTY_PROFILE = Object.freeze({
  full_name: '',
  target_roles: [],
  location: '',
  bio: '',
  default_view_id: null,
  date_format: 'month_day',
})

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
      if (data) setProfile({ ...EMPTY_PROFILE, ...data })
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [userId])

  const save = useCallback(async patch => {
    const next = { ...profile, ...patch }
    const before = profile
    setProfile(next)
    const { ok, result } = await track(upsertRow('profiles', {
      user_id: userId,
      full_name: next.full_name,
      target_roles: next.target_roles,
      location: next.location,
      bio: next.bio,
      default_view_id: next.default_view_id,
      date_format: next.date_format,
    }, 'user_id'))
    if (!ok) { setProfile(before); return false }
    setProfile({ ...EMPTY_PROFILE, ...result })
    return true
  }, [profile, track, userId])

  const value = useMemo(() => ({ profile, status, save }), [profile, status, save])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfile = () => useContext(ProfileContext)
