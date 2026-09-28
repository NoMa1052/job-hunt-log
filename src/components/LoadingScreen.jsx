import { useEffect, useRef, useState } from 'react'
import brand from '../config/brand'
import { FADE_MS, exitDelay } from '../lib/loading'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Full-screen logo shown while the app loads its data. A light traces the
// mark's curve into the dot; with reduced motion the logo stays still.
export default function LoadingScreen({ ready }) {
  const [phase, setPhase] = useState('loading') // loading | fading | done
  const start = useRef(performance.now())

  useEffect(() => {
    if (!ready) return
    const delay = exitDelay(performance.now() - start.current, { reducedMotion: prefersReducedMotion() })
    const timers = []
    if (delay === null) {
      timers.push(setTimeout(() => setPhase('done'), 0))
    } else {
      timers.push(setTimeout(() => setPhase('fading'), delay))
      timers.push(setTimeout(() => setPhase('done'), delay + (prefersReducedMotion() ? 0 : FADE_MS)))
    }
    return () => timers.forEach(clearTimeout)
  }, [ready])

  if (phase === 'done') return null
  return (
    <div className={`loading-screen${phase === 'fading' ? ' is-fading' : ''}`} role="status" aria-live="polite">
      <svg className="loading-mark" viewBox="0 0 120 120" aria-hidden="true">
        <rect width="120" height="120" rx="28" fill="var(--indigo)" />
        <path className="loading-mark__base" d="M31 81 C31 45 59 45 59 61 C59 77 87 77 87 41" pathLength="100" />
        <path className="loading-mark__trace" d="M31 81 C31 45 59 45 59 61 C59 77 87 77 87 41" pathLength="100" />
        <circle className="loading-mark__dot" cx="87" cy="41" r="10" fill="var(--amber)" />
      </svg>
      <span className="sr-only">Loading {brand.name}…</span>
    </div>
  )
}
