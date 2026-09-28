import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useData } from '../state/DataProvider'
import { followUpsDue, statusCounts } from '../features/applications/options'
import brand from '../config/brand'
import { Button } from '../ui'
import markUrl from '../assets/sidekick-mark.svg'
import SaveStatus from './SaveStatus'

const TABS = [
  { path: 'applications', label: 'Applications', collection: 'applications' },
  { path: 'conversations', label: 'Conversations', collection: 'people' },
  { path: 'companies', label: 'Companies', collection: 'companies' },
]

export default function AppShell() {
  const { data } = useData()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const applications = data.applications.rows
  const counts = statusCounts(applications)
  const due = followUpsDue(applications)

  return (
    <div className="sk-app page">
      <header className="sk-header app-header">
        <div className="sk-brand">
          <img className="sk-brand__mark" src={markUrl} alt="" width="36" height="36" />
          <h1 className="sk-brand__name">{brand.wordmark}</h1>
        </div>
        <div className="app-header-right">
          <dl className="sk-stats" aria-label="Application totals">
            <Stat value={applications.length} label="Applied" />
            <Stat value={counts.screen + counts.interview} label="Interviewing" />
            {due > 0 && <Stat value={due} label="Follow-ups due" light />}
          </dl>
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      </header>

      <div className="sk-tabs app-tabs" role="tablist" aria-label="Sections">
        {TABS.map(t => {
          const selected = pathname.startsWith(`/app/${t.path}`)
          return (
            <button
              key={t.path}
              type="button"
              role="tab"
              className="sk-tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => navigate(`/app/${t.path}`)}
              onKeyDown={e => {
                // Arrow keys move between tabs (standard tablist behavior).
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                const i = TABS.indexOf(t)
                const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
                navigate(`/app/${next.path}`)
                requestAnimationFrame(() => document.getElementById(`tab-${next.path}`)?.focus())
              }}
              id={`tab-${t.path}`}
            >
              {t.label}
              <span className="sk-tab__count">{data[t.collection].rows.length}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-labelledby={`tab-${TABS.find(t => pathname.startsWith(`/app/${t.path}`))?.path || 'applications'}`}>
        <Outlet />
      </div>

      <SaveStatus />
    </div>
  )
}

function Stat({ value, label, light = false }) {
  return (
    <div className={`sk-stat ${light ? 'sk-stat--light' : ''}`.trim()}>
      <dt className="sk-stat__label">{label}</dt>
      <dd className="sk-stat__value">{value}</dd>
    </div>
  )
}
