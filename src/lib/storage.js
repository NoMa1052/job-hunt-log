// Per-user browser preferences (column order, filters). Keys are scoped to the
// signed-in user so two accounts on one browser never see each other's filters.
// The prefix is deliberately brand-neutral so a rename doesn't reset settings.
const PREFIX = 'app'
const LEGACY_PREFIX = 'jhl-' // pre-2026-09 unscoped keys, e.g. "jhl-col-order"

export function storageKey(userId, name) {
  return `${PREFIX}:${userId}:${name}`
}

export function loadPref(userId, name, fallback, store = globalThis.localStorage) {
  try {
    const raw = store.getItem(storageKey(userId, name))
    if (raw !== null) return JSON.parse(raw)
    // One-time migration: adopt the old unscoped value for the first user who
    // reads it, then remove it so no other account inherits it.
    const legacy = store.getItem(LEGACY_PREFIX + name)
    if (legacy !== null) {
      store.removeItem(LEGACY_PREFIX + name)
      store.setItem(storageKey(userId, name), legacy)
      return JSON.parse(legacy)
    }
  } catch { /* storage blocked or corrupt: use the default */ }
  return fallback
}

export function savePref(userId, name, value, store = globalThis.localStorage) {
  try { store.setItem(storageKey(userId, name), JSON.stringify(value)) } catch { /* ignore */ }
}
