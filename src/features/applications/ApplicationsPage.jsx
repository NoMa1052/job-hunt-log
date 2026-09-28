import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { useProfile } from '../../state/ProfileProvider'
import useTableViews from '../../state/useTableViews'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatShortDate } from '../../lib/format'
import { Button, Chip, ConfirmDialog, FollowUp, Icon, IconButton } from '../../ui'
import CollectionState from '../../components/CollectionState'
import PageHeader from '../../components/PageHeader'
import ApplicationPanel from './ApplicationPanel'
import ColumnsMenu from './ColumnsMenu'
import FilterBuilder from './FilterBuilder'
import ViewTabs, { ALL_VIEW } from './ViewTabs'
import { EXPORT_HEADERS, PRIORITY_OPTIONS, followUp, optionLabel, statusChip } from './options'
import { DEFAULT_CONFIG, applyView, column, legacyToConfig, nextSort, normalizeConfig, sameConfig } from './views'

export default function ApplicationsPage() {
  const { data, add, update, remove, reload } = useData()
  const { profile, status: profileStatus } = useProfile()
  const defaultViewId = profile.default_view_id
  const dateFormat = profile.date_format
  const applications = data.applications.rows
  const tableViews = useTableViews('applications', { legacyToConfig })
  const [confirmId, setConfirmId] = useState(null)
  const [allConfig, setAllConfig] = useState(DEFAULT_CONFIG)

  // The open application and the active view both live in the URL, so
  // reload, back and shared links work.
  const { appId: editingAppId } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const [searchParams] = useSearchParams()
  const setEditingAppId = id => navigate({ pathname: id ? `/app/applications/${id}` : '/app/applications', search })

  const requestedView = searchParams.get('view') || defaultViewId || ALL_VIEW
  const activeView = tableViews.views.find(v => v.id === requestedView)
  const activeId = activeView ? activeView.id : ALL_VIEW
  const config = useMemo(() => normalizeConfig(activeView ? activeView.config : allConfig), [activeView, allConfig])
  const { saveConfig } = tableViews
  const setConfig = useCallback(patch => {
    const next = normalizeConfig({ ...config, ...patch })
    if (activeView) saveConfig(activeView.id, next)
    else setAllConfig(next)
  }, [config, activeView, saveConfig])

  function selectView(id) {
    const params = new URLSearchParams(search)
    // With a default view set, "All applications" has to be explicit.
    if (id === ALL_VIEW && !defaultViewId) params.delete('view'); else params.set('view', id)
    const qs = params.toString()
    navigate({ pathname: '/app/applications', search: qs ? `?${qs}` : '' })
  }
  async function createView(name, fromConfig = config) {
    const row = await tableViews.create(name, fromConfig)
    if (row) { if (!activeView) setAllConfig(DEFAULT_CONFIG); selectView(row.id) }
  }

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
  const viewsUnavailable = tableViews.status === 'unavailable' || tableViews.status === 'error'
  // A link to a saved view waits for the views to load instead of flashing
  // the wrong layout first.
  const waitingForView = (requestedView !== ALL_VIEW && tableViews.status === 'loading')
    || (!searchParams.get('view') && profileStatus === 'loading')

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
          <FilterBuilder filters={config.filters} onChange={filters => setConfig({ filters })} />
          <ColumnsMenu columns={config.columns} onChange={columns => setConfig({ columns })} />
          <Button variant="primary" icon="plus" onClick={addApplication}>Add application</Button>
        </>}
      />

      <ViewTabs
        views={tableViews.views}
        activeId={activeId}
        allDirty={!activeView && !sameConfig(allConfig, DEFAULT_CONFIG)}
        disabled={viewsUnavailable || tableViews.status === 'loading'}
        onSelect={selectView}
        onCreate={name => createView(name)}
        onRename={tableViews.rename}
        onDuplicate={v => createView(`${v.name} copy`.slice(0, 60), normalizeConfig(v.config))}
        onDelete={id => { tableViews.remove(id); if (id === activeId) selectView(ALL_VIEW) }}
      />
      {viewsUnavailable && <p className="views-note" role="status">Saved views aren't available right now. Changes to columns, sorting and filters last until you leave the page.</p>}

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              {visibleColumns.map(col => {
                const sorted = config.sort?.key === col.key ? config.sort.dir : null
                return (
                  <th key={col.key} scope="col" aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}>
                    <button type="button" className={`sort-btn ${sorted ? 'is-sorted' : ''}`.trim()} onClick={() => setConfig({ sort: nextSort(config.sort, col.key) })}>
                      {col.label}
                      <span className="sort-icon" aria-hidden="true">{sorted ? <Icon name={sorted === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} /> : null}</span>
                    </button>
                  </th>
                )
              })}
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
