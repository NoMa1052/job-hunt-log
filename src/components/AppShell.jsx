import { NavLink, Outlet } from 'react-router-dom'
import brand from '../config/brand'
import SaveStatus from './SaveStatus'
import SidekickLogo from './SidekickLogo'
import UserMenu from './UserMenu'

const SECTIONS = [
  { path: 'applications', label: 'Applications' },
  { path: 'conversations', label: 'Conversations' },
  { path: 'companies', label: 'Companies' },
]

export default function AppShell() {
  return (
    <div className="sk-app app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="sk-brand">
            <span className="sk-brand__mark" aria-hidden="true"><SidekickLogo size={28} /></span>
            <span className="sk-brand__name">{brand.wordmark}</span>
          </div>
          <nav className="topnav" aria-label="Sections">
            {SECTIONS.map(s => (
              <NavLink key={s.path} to={s.path} className="topnav-link">{s.label}</NavLink>
            ))}
          </nav>
        </div>
        <UserMenu />
      </header>

      <main className="page">
        <Outlet />
        <SaveStatus />
      </main>
    </div>
  )
}
