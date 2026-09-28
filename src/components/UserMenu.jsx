import { supabase } from '../lib/supabaseClient'
import { useUser } from '../state/UserContext'
import { Popover } from '../ui'
import { useNavigate } from 'react-router-dom'
import { initialsFor, initialsFromName } from '../lib/initials'
import { useProfile } from '../state/ProfileProvider'

export default function UserMenu() {
  const user = useUser()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const email = user?.email || ''
  const initials = initialsFromName(profile.full_name) || initialsFor(email)
  return (
    <Popover
      align="end"
      className="user-menu"
      trigger={({ open, toggle }) => (
        <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${email}`} onClick={toggle}>
          {initials}
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" aria-label="Account">
          <p className="user-menu-email" title={email}>{profile.full_name && <strong className="user-menu-name">{profile.full_name}</strong>}{email}</p>
          <button type="button" role="menuitem" className="user-menu-item" autoFocus onClick={() => { close(); navigate('/app/settings') }}>
            Profile and settings
          </button>
          <button type="button" role="menuitem" className="user-menu-item" onClick={() => { close(); supabase.auth.signOut() }}>
            Sign out
          </button>
        </div>
      )}
    </Popover>
  )
}
