import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useData } from '../state/DataProvider'
import { statusCounts } from '../features/applications/options'
import brand from '../config/brand'
import { Button, Logo } from '../ui'
import SaveStatus from './SaveStatus'

const TABS = [
  { to: 'applications', label: 'Applications' },
  { to: 'conversations', label: 'Conversations' },
  { to: 'companies', label: 'Companies' },
]

export default function AppShell() {
  const { data } = useData()
  const applications = data.applications.rows
  const counts = statusCounts(applications)
  const active = applications.length - counts.rejected - counts.withdrawn

  return (
    <div className="page">
      <header className="app-header">
        <h1 className="app-brand">
          <Logo variant="light" size={36} wordmark={brand.wordmark} />
          <span className="sr-only">{brand.name}: {brand.description}</span>
          <span className="app-tagline" aria-hidden="true">{brand.tagline}</span>
        </h1>
        <div className="app-header-right">
          <div className="stats" aria-label="Application totals">
            <Stat num={applications.length} label="Applied" />
            <Stat num={counts.screen + counts.interview} label="In process" />
            <Stat num={counts.offer} label="Offers" />
            <Stat num={active} label="Active" />
          </div>
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>{t.label}</NavLink>
        ))}
      </nav>

      <Outlet />

      <SaveStatus />
    </div>
  )
}

function Stat({ num, label }) {
  return (
    <div className="stat">
      <span className="stat-num">{num}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
