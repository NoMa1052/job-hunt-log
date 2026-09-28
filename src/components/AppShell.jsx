import { NavLink, Outlet } from 'react-router-dom'
import brand from '../config/brand'
import markUrl from '../assets/sidekick-mark.svg'
import SaveStatus from './SaveStatus'
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
            <img className="sk-brand__mark" src={markUrl} alt="" width="28" height="28" />
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
