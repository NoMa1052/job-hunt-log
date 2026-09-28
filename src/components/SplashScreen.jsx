import { useEffect, useState } from 'react'
import brand from '../config/brand'
import SidekickLogo from './SidekickLogo'

// Plays once per browser session: after sign-in, or on the first load.
const PLAYED_KEY = 'app:splash-played' // brand-neutral, like lib/storage.js
const FADE_MS = 250

function alreadyPlayed() {
  try { return sessionStorage.getItem(PLAYED_KEY) === '1' } catch { return false }
}

function markPlayed() {
  try { sessionStorage.setItem(PLAYED_KEY, '1') } catch { /* storage blocked: may play again */ }
}

// The animated logo over the app while its data loads. It fades out once the
// animation has finished and the data is ready, whichever comes last. With
// reduced motion the logo stays still and it leaves as soon as data is ready.
export default function SplashScreen({ ready }) {
  const [phase, setPhase] = useState(() => (alreadyPlayed() ? 'done' : 'playing')) // playing | fading | done
  const [animDone, setAnimDone] = useState(false)

  useEffect(() => {
    if (phase !== 'playing' || !animDone || !ready) return
    markPlayed()
    const t = setTimeout(() => setPhase('fading'), 0)
    return () => clearTimeout(t)
  }, [phase, animDone, ready])

  useEffect(() => {
    if (phase !== 'fading') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setPhase('done'), reduce ? 0 : FADE_MS)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null
  return (
    <div className={`splash${phase === 'fading' ? ' is-fading' : ''}`} role="status">
      <SidekickLogo size={96} animate onComplete={() => setAnimDone(true)} title={`Loading ${brand.name}`} />
    </div>
  )
}
