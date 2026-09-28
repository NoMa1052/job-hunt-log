// Loading screen timing. The animation only appears once loading has taken
// longer than SKIP_MS; after that it always finishes the cycle it's on
// before fading out, so it never cuts off mid-trace.
export const SKIP_MS = 300
export const CYCLE_MS = 900
export const FADE_MS = 250

// Milliseconds to keep the animation playing once data is ready `elapsed` ms
// after the screen appeared. null means skip the screen entirely.
export function exitDelay(elapsed, { reducedMotion = false } = {}) {
  if (elapsed < SKIP_MS) return null
  if (reducedMotion) return 0
  const into = (elapsed - SKIP_MS) % CYCLE_MS
  return into === 0 ? 0 : CYCLE_MS - into
}
