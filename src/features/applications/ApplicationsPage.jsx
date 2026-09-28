import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataProvider'
import { loadPref, savePref } from '../../lib/storage'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV, formatShortDate } from '../../lib/format'
import { Button, Chip, ConfirmDialog, FilterPopover, FollowUp, Icon, IconButton, Popover } from '../../ui'
import CollectionState from '../../components/CollectionState'
import PageHeader from '../../components/PageHeader'
import ApplicationPanel from './ApplicationPanel'
import {
  ALL_COLUMNS, DEFAULT_ORDER, DEFAULT_HIDDEN, EXPORT_HEADERS, PRIORITY_OPTIONS,
  followUp, optionLabel, passesFilters, statusChip,
} from './options'

export default function ApplicationsPage() {
  const { userId, data, add, update, remove, reload } = useData()
  const applications = data.applications.rows

  const [columnOrder, setColumnOrder] = useState(() => loadPref(userId, 'col-order', DEFAULT_ORDER))
  const [hiddenCols, setHiddenCols] = useState(() => new Set(loadPref(userId, 'hidden-cols', DEFAULT_HIDDEN)))
  const [colFilters, setColFilters] = useState(() => loadPref(userId, 'col-filters', {}))
  // The open application lives in the URL (/app/applications/:appId), so
  // reload, back and shared links all work.
  const { appId: editingAppId } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const setEditingAppId = id => navigate({ pathname: id ? `/app/applications/${id}` : '/app/applications', search })
  const [confirmId, setConfirmId] = useState(null)
  const dragColIdxRef = useRef(null)

  useEffect(() => { savePref(userId, 'col-order', columnOrder) }, [userId, columnOrder])
  useEffect(() => { savePref(userId, 'hidden-cols', [...hiddenCols]) }, [userId, hiddenCols])
  useEffect(() => { savePref(userId, 'col-filters', colFilters) }, [userId, colFilters])

  async function addApplication() {
    const row = await add('applications', { company: '', position: '', location: '', status: 'applied', priority: 'medium' })
    if (row) setEditingAppId(row.id)
  }
  const updateApplication = (id, field, value) => update('applications', id, field, value)

  function toggleColumn(key) {
    setHiddenCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }
  function reorderColumns(fromIdx, toIdx) {
    setColumnOrder(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
  }
  function setTextFilter(key, value) { setColFilters(prev => ({ ...prev, [key]: value })) }
  function toggleSelectFilter(key, value, options) {
    setColFilters(prev => {
      const current = prev[key] ? [...prev[key]] : options.map(o => o.value)
      const idx = current.indexOf(value)
      if (idx >= 0) current.splice(idx, 1); else current.push(value)
      return { ...prev, [key]: current }
    })
  }

  // The whole row opens the detail view; links and buttons inside it keep
  // their own behavior.
  function openFromRow(e, id) {
    if (e.target.closest('a, button')) return
    setEditingAppId(id)
  }

  const visibleColumns = columnOrder.filter(k => !hiddenCols.has(k)).map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)
  const filteredApplications = applications.filter(a => passesFilters(a, colFilters))
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
          <Button variant="ghost" icon="download" onClick={() => downloadCSV('applications.csv', toCSV(EXPORT_HEADERS, filteredApplications))}>Export</Button>
          <Popover align="end" trigger={({ open, toggle }) => <Button variant="secondary" icon="columns" onClick={toggle} aria-expanded={open} title="Select a row to see and edit every field. Select a column name to filter it.">Columns</Button>}>
            {columnOrder.map((key, idx) => {
              const col = ALL_COLUMNS.find(c => c.key === key)
              if (!col) return null
              return (
                <div
                  key={key}
                  className="col-row"
                  draggable
                  onDragStart={() => { dragColIdxRef.current = idx }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    const from = dragColIdxRef.current
                    if (from === null || from === idx) return
                    reorderColumns(from, idx)
                    dragColIdxRef.current = null
                  }}
                >
                  <span className="drag-handle" aria-hidden="true"><Icon name="grip" size={14} /></span>
                  <label className="ui-popover-row">
                    <input type="checkbox" checked={!hiddenCols.has(key)} onChange={() => toggleColumn(key)} />
                    {col.label}
                  </label>
                </div>
              )
            })}
          </Popover>
          <Button variant="primary" icon="plus" onClick={addApplication}>Add application</Button>
        </>}
      />

      <div className="sk-table-panel">
        <table className="sk-table">
          <thead>
            <tr>
              {visibleColumns.map(col => (
                <th key={col.key} scope="col">
                  {col.type === 'text' && (
                    <FilterPopover label={col.label} value={colFilters[col.key]} onChange={v => setTextFilter(col.key, v)} />
                  )}
                  {col.type === 'select' && (
                    <FilterPopover label={col.label} options={col.options} selected={colFilters[col.key]} onToggle={v => toggleSelectFilter(col.key, v, col.options)} />
                  )}
                  {col.type !== 'text' && col.type !== 'select' && col.label}
                </th>
              ))}
              <th className="col-actions"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map(a => (
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
                {visibleColumns.map(col => renderAppCell(col, a))}
                <td className="col-actions">
                  <IconButton icon="x" size="sm" label="Delete application" onClick={() => setConfirmId(a.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <CollectionState state={data.applications} onRetry={() => reload('applications')}>
          {filteredApplications.length === 0 && (
            <div className="empty-state">
              {applications.length === 0 ? 'No applications logged yet. Add your first one above.' : 'Nothing matches the current filters.'}
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

function renderAppCell(col, a) {
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
      return <td key={col.key} className="sk-cell-meta">{formatShortDate(a[col.key]) || dash}</td>
    case 'follow_up_date': {
      const f = followUp(a)
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
