import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import brand from '../config/brand'
import SaveStatus from './SaveStatus'
import UndoToast from './UndoToast'
import SidekickLogo from './SidekickLogo'
import UserMenu from './UserMenu'
import { useResumesAvailable } from '../features/resumes/api'

const SECTIONS = [
  { path: 'applications', label: 'Applications' },
  { path: 'conversations', label: 'Conversations' },
  { path: 'companies', label: 'Companies' },
]

export default function AppShell() {
  // Resumes shows up once its migration is applied to this database.
  const resumesAvailable = useResumesAvailable()
  const { pathname } = useLocation()
  // On phones the section tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    document.querySelector('.topnav [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname, resumesAvailable])
  const sections = resumesAvailable ? [...SECTIONS, { path: 'resumes', label: 'Resumes', badge: 'New', accent: true }] : SECTIONS
  return (
    <div className="sk-app app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="sk-brand">
            <span className="sk-brand__mark" aria-hidden="true"><SidekickLogo size={28} /></span>
            <span className="sk-brand__name">{brand.wordmark}</span>
          </div>
          <nav className="topnav" aria-label="Sections">
            {sections.map(s => (
              <NavLink key={s.path} to={s.path} className={`topnav-link${s.accent ? ' topnav-link--accent' : ''}`}>
                {s.label}
                {s.badge && <span className="topnav-badge">{s.badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <UserMenu />
      </header>

      <main className="page">
        <Outlet />
        <SaveStatus />
        <UndoToast />
      </main>
    </div>
  )
}
