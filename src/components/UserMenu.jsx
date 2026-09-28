import { supabase } from '../lib/supabaseClient'
import { useUser } from '../state/UserContext'
import { Popover } from '../ui'
import { initialsFor } from '../lib/initials'

export default function UserMenu() {
  const user = useUser()
  const email = user?.email || ''
  return (
    <Popover
      align="end"
      className="user-menu"
      trigger={({ open, toggle }) => (
        <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${email}`} onClick={toggle}>
          {initialsFor(email)}
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" aria-label="Account">
          <p className="user-menu-email" title={email}>{email}</p>
          <button type="button" role="menuitem" className="user-menu-item" autoFocus onClick={() => { close(); supabase.auth.signOut() }}>
            Sign out
          </button>
        </div>
      )}
    </Popover>
  )
}
