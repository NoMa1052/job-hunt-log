// Set just before signing out after deleting an account, so the sign-in
// screen can confirm it happened.
export const ACCOUNT_DELETED_FLAG = 'account-deleted'

export function markAccountDeleted() {
  try { sessionStorage.setItem(ACCOUNT_DELETED_FLAG, '1') } catch { /* ignore */ }
}

export function wasAccountDeleted() {
  try { return sessionStorage.getItem(ACCOUNT_DELETED_FLAG) === '1' } catch { return false }
}

export function clearAccountDeleted() {
  try { sessionStorage.removeItem(ACCOUNT_DELETED_FLAG) } catch { /* ignore */ }
}
