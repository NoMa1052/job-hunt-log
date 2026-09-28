import { useEffect } from 'react'
import { useData } from '../state/DataProvider'
import { useProfile } from '../state/ProfileProvider'

// Tells the loading screen once the first load of every list (and the
// profile) has finished, whether it worked or not.
export default function AppReady({ onReady }) {
  const { data } = useData()
  const { status } = useProfile()
  const done = status !== 'loading' && Object.values(data).every(c => c.status !== 'loading')
  useEffect(() => { if (done) onReady() }, [done, onReady])
  return null
}
