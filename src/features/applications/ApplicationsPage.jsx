import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { useProfile } from '../../state/ProfileProvider'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatShortDate } from '../../lib/format'
import { Button, Chip, ConfirmDialog, FollowUp, Icon, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import PageHeader from '../../components/PageHeader'
import ApplicationPanel from './ApplicationPanel'
import CustomizeMenu from '../views/CustomizeMenu'
import SortHeader from '../views/SortHeader'
import { ViewsBar } from '../views/ViewTabs'
import useViewState from '../views/useViewState'
import { EXPORT_HEADERS, PRIORITY_OPTIONS, followUp, optionLabel, statusChip } from './options'
import { applicationsModel, applyView, column, legacyToConfig } from './views'

export default function ApplicationsPage() {
  const { data, add, update, remove, reload } = useData()
  const { profile, status: profileStatus } = useProfile()
  const dateFormat = profile.date_format
  const applications = data.applications.rows
  const [confirmId, setConfirmId] = useState(null)
  const views = useViewState({
    tableName: 'applications',
    model: applicationsModel,
    basePath: '/app/applications',
    legacyToConfig,
    fallbackDefaultId: profile.default_view_id,
    fallbackLoading: profileStatus === 'loading',
  })
  const { config, setConfig, waitingForView } = views

  // The open application lives in the URL, so reload, back and shared links work.
  const { appId: editingAppId } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const setEditingAppId = id => navigate({ pathname: id ? `/app/applications/${id}` : '/app/applications', search })

  async function addApplication() {
    const row = await add('applications', { company: '', position: '', location: '', status: 'applied', priority: 'medium' })
    if (row) setEditingAppId(row.id)
  }
  const updateApplication = (id, field, value) => update('applications', id, field, value)

  // The whole row opens the detail view; links and buttons inside it keep
  // their own behavior.
  function openFromRow(e, id) {
    if (e.target.closest('a, button')) return
    setEditingAppId(id)
  }

  const visibleColumns = config.columns.filter(c => c.visible).map(c => column(c.key))
  const shownApplications = useMemo(() => applyView(applications, config), [applications, config])
  const editingApp = editingAppId ? applications.find(a => a.id === editingAppId) : null

  // A link to an application that doesn't exist (deleted, or someone else's)
  // falls back to the list once the data has loaded.
  useEffect(() => {
    if (editingAppId && data.applications.status === 'ready' && !editingApp) navigate({ pathname: '/app/applications', search }, { replace: true })
  }, [editingAppId, editingApp, data.applications.status, navigate, search])

  return (
    <section aria-label="Applications">
      <PageHeader
        title="Applications"
        actions={<>
          <Button variant="ghost" icon="download" onClick={() => downloadCSV('applications.csv', toCSV(EXPORT_HEADERS, shownApplications))}>Export</Button>
          <CustomizeMenu
            model={applicationsModel}
            config={config}
            onChange={setConfig}
            onReset={views.reset}
            canReset={!views.isDefaultLayout}
            onSaveAs={views.viewsUnavailable ? null : name => views.createView(name)}
            noun="applications"
          />
          <Button variant="primary" icon="plus" onClick={addApplication}>Add application</Button>
        </>}
      />

      <ViewsBar state={views} allLabel="All applications" noun="applications" />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              {visibleColumns.map(col => <SortHeader key={col.key} col={col} sort={config.sort} onSort={sort => setConfig({ sort })} />)}
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {!waitingForView && shownApplications.map(a => (
              <tr
                key={a.id}
                className="row-link"
                tabIndex={0}
                aria-selected={editingAppId === a.id}
                aria-label={`${a.company || 'Untitled application'}${a.position ? `, ${a.position}` : ''}: open details`}
                onClick={e => openFromRow(e, a.id)}
                onKeyDown={e => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditingAppId(a.id) }
                }}
              >
                {visibleColumns.map(col => renderAppCell(col, a, dateFormat))}
                <td className="col-actions">
                  <IconButton icon="x" size="sm" label="Delete application" onClick={() => setConfirmId(a.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <CollectionState state={waitingForView ? { status: 'loading', rows: [] } : data.applications} onRetry={() => reload('applications')}>
          {shownApplications.length === 0 && (
            <div className="empty-state">
              {applications.length === 0 ? 'No applications logged yet. Add your first one above.' : (
                <>Nothing matches this view's filters. <Button variant="link" onClick={() => setConfig({ filters: [] })}>Clear filters</Button></>
              )}
            </div>
          )}
        </CollectionState>
      </div>

      {editingApp && (
        <ApplicationPanel key={editingApp.id} app={editingApp} onUpdate={(field, value) => updateApplication(editingApp.id, field, value)} onClose={() => setEditingAppId(null)} />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this? This can't be undone."
          onConfirm={() => { if (confirmId === editingAppId) setEditingAppId(null); remove('applications', confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </section>
  )
}

const dash = <span aria-label="None">—</span>

function renderAppCell(col, a, dateFormat) {
  switch (col.key) {
    case 'company':
      return <td key="company" className="sk-cell-company">{a.company || <span className="sk-cell-meta">Untitled</span>}</td>
    case 'position': {
      const href = safeUrl(a.link)
      return (
        <td key="position">
          {href
            ? <a className="sk-cell-link" href={href} target="_blank" rel="noopener noreferrer" title="Opens where you applied">{a.position || 'Position'}</a>
            : a.position || <span className="sk-cell-meta">—</span>}
        </td>
      )
    }
    case 'location': case 'source': case 'salary': case 'hiring_manager': case 'connections':
      return <td key={col.key} className="sk-cell-meta">{a[col.key] || dash}</td>
    case 'date_applied': case 'interview_date':
      return <td key={col.key} className="sk-cell-meta">{formatShortDate(a[col.key], undefined, dateFormat) || dash}</td>
    case 'follow_up_date': {
      const f = followUp(a, undefined, dateFormat)
      return <td key={col.key}><FollowUp state={f.state}>{f.text}</FollowUp></td>
    }
    case 'status': {
      const chip = statusChip(a.status)
      return <td key="status"><Chip kind={chip.kind}>{chip.label}</Chip></td>
    }
    case 'priority':
      return <td key="priority" className="sk-cell-meta">{optionLabel(PRIORITY_OPTIONS, a.priority, 'medium')}</td>
    case 'letter': {
      const href = safeUrl(a.cover_letter_link)
      return (
        <td key="letter" className="center">
          {href
            ? <a className="icon-link" href={href} target="_blank" rel="noopener noreferrer" title="Open cover letter" aria-label="Open cover letter"><Icon name="file-text" /></a>
            : <span className="sk-cell-meta">—</span>}
        </td>
      )
    }
    default:
      return <td key={col.key}></td>
  }
}
