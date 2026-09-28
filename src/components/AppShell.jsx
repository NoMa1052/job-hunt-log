import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useData } from '../state/DataProvider'
import { statusCounts } from '../features/applications/options'
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
    <div className="wrap">
      <h2 className="sr-only">Job hunt tracker with an applications ledger, a networking conversation log, and a companies watchlist.</h2>

      <header>
        <h1>Job Hunt Log<span>Applications &amp; networking, operations style</span></h1>
        <div className="header-right">
          <div className="tally">
            <TallyItem num={applications.length} label="Applied" />
            <TallyItem num={counts.screen + counts.interview} label="In process" />
            <TallyItem num={counts.offer} label="Offers" />
            <TallyItem num={active} label="Active" />
          </div>
          <button className="add-btn secondary sign-out-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>{t.label}</NavLink>
        ))}
      </nav>

      <Outlet />

      <SaveStatus />
    </div>
  )
}

function TallyItem({ num, label }) {
  return (
    <div className="tally-item">
      <span className="tally-num">{num}</span>
      <span className="tally-label">{label}</span>
    </div>
  )
}
