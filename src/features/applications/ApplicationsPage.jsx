import { useEffect, useRef, useState } from 'react'
import { useData } from '../../state/DataProvider'
import { loadPref, savePref } from '../../lib/storage'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV } from '../../lib/format'
import { EditableCell, PositionCell } from '../../components/cells'
import CollectionState from '../../components/CollectionState'
import ConfirmDialog from '../../components/ConfirmDialog'
import useDismissPopovers from '../../components/useDismissPopovers'
import ApplicationModal from './ApplicationModal'
import {
  ALL_COLUMNS, DEFAULT_ORDER, DEFAULT_HIDDEN, EXPORT_HEADERS, STATUS_OPTIONS, PRIORITY_OPTIONS,
  optionClass, passesFilters, hasActiveFilter,
} from './options'

export default function ApplicationsPage() {
  const { userId, data, add, update, remove, reload } = useData()
  const applications = data.applications.rows

  const [columnOrder, setColumnOrder] = useState(() => loadPref(userId, 'col-order', DEFAULT_ORDER))
  const [hiddenCols, setHiddenCols] = useState(() => new Set(loadPref(userId, 'hidden-cols', DEFAULT_HIDDEN)))
  const [colFilters, setColFilters] = useState(() => loadPref(userId, 'col-filters', {}))
  const [openFilterCol, setOpenFilterCol] = useState(null)
  const [manageColsOpen, setManageColsOpen] = useState(false)
  const [editingAppId, setEditingAppId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const dragColIdxRef = useRef(null)

  useEffect(() => { savePref(userId, 'col-order', columnOrder) }, [userId, columnOrder])
  useEffect(() => { savePref(userId, 'hidden-cols', [...hiddenCols]) }, [userId, hiddenCols])
  useEffect(() => { savePref(userId, 'col-filters', colFilters) }, [userId, colFilters])
  useDismissPopovers(() => { setOpenFilterCol(null); setManageColsOpen(false) })

  async function addApplication() {
    const row = await add('applications', { company: '', position: '', location: '', status: 'applied', priority: 'medium' })
    if (row) setEditingAppId(row.id)
  }
  const updateApplication = (id, field, value) => update('applications', id, field, value)

  function hideColumn(key) { setHiddenCols(prev => new Set(prev).add(key)) }
  function showColumn(key) { setHiddenCols(prev => { const next = new Set(prev); next.delete(key); return next }) }
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

  const visibleColumns = columnOrder.filter(k => !hiddenCols.has(k)).map(k => ALL_COLUMNS.find(c => c.key === k)).filter(Boolean)
  const filteredApplications = applications.filter(a => passesFilters(a, colFilters))
  const editingApp = editingAppId ? applications.find(a => a.id === editingAppId) : null

  return (
    <div className="panel">
      <div className="panel-head">
        <p>Click the ⤢ icon to open every field. Click a column name to filter it.</p>
        <div className="panel-head-btns">
          <div className="popover-wrap">
            <button className="add-btn secondary" onClick={() => setManageColsOpen(!manageColsOpen)}>Columns</button>
            {manageColsOpen && (
              <div className="popover manage-cols-popover">
                {columnOrder.map((key, idx) => {
                  const col = ALL_COLUMNS.find(c => c.key === key)
                  if (!col) return null
                  return (
                    <div
                      key={key}
                      className="manage-col-row"
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
                      <span className="drag-handle">⋮⋮</span>
                      <label className="popover-row" style={{ flex: 1 }}>
                        <input type="checkbox" checked={!hiddenCols.has(key)} onChange={() => hiddenCols.has(key) ? showColumn(key) : hideColumn(key)} />
                        {col.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <button className="add-btn secondary" onClick={() => downloadCSV('applications.csv', toCSV(EXPORT_HEADERS, filteredApplications))}>Export CSV</button>
          <button className="add-btn" onClick={addApplication}>+ Add application</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              {visibleColumns.map(col => (
                <th key={col.key}>
                  {(col.type === 'text' || col.type === 'select') ? (
                    <div className="popover-wrap">
                      <button className={'col-label-btn' + (hasActiveFilter(col, colFilters) ? ' active-filter' : '')} onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)}>
                        {col.label}{hasActiveFilter(col, colFilters) && <span className="filter-dot" />}
                      </button>
                      {openFilterCol === col.key && (
                        <div className="popover">
                          {col.type === 'text' && (
                            <input autoFocus className="col-filter" placeholder="filter…" value={colFilters[col.key] || ''} onChange={e => setTextFilter(col.key, e.target.value)} />
                          )}
                          {col.type === 'select' && col.options.map(o => (
                            <label key={o.value} className="popover-row">
                              <input type="checkbox" checked={!colFilters[col.key] || colFilters[col.key].includes(o.value)} onChange={() => toggleSelectFilter(col.key, o.value, col.options)} />
                              {o.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="col-label-plain">{col.label}</span>
                  )}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map(a => (
              <tr key={a.id} className="app-row">
                <td className="expand-cell" onClick={() => setEditingAppId(a.id)} title="Open full details">
                  <span className="expand-icon">⤢</span>
                </td>
                {visibleColumns.map(col => renderAppCell(col, a, (field, value) => updateApplication(a.id, field, value)))}
                <td><button className="del-btn" title="Delete row" onClick={() => setConfirmId(a.id)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CollectionState state={data.applications} onRetry={() => reload('applications')}>
        {filteredApplications.length === 0 && (
          <div className="empty-state">
            {applications.length === 0 ? 'No applications logged yet. Add your first one above.' : 'Nothing matches the current filters.'}
          </div>
        )}
      </CollectionState>

      {editingApp && (
        <ApplicationModal app={editingApp} onUpdate={(field, value) => updateApplication(editingApp.id, field, value)} onClose={() => setEditingAppId(null)} />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this? This can't be undone."
          onConfirm={() => { remove('applications', confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

function renderAppCell(col, a, onUpdate) {
  switch (col.key) {
    case 'company':
      return <EditableCell key="company" value={a.company} placeholder="Company" onSave={v => onUpdate('company', v)} />
    case 'position':
      return <PositionCell key="position" value={a.position} link={safeUrl(a.link)} onSave={v => onUpdate('position', v)} />
    case 'location': case 'source': case 'salary': case 'hiring_manager': case 'connections':
      return <EditableCell key={col.key} value={a[col.key]} placeholder="—" onSave={v => onUpdate(col.key, v)} />
    case 'date_applied': case 'follow_up_date': case 'interview_date':
      return (
        <td key={col.key} className="num-col">
          <input type="date" value={a[col.key] || ''} onChange={e => onUpdate(col.key, e.target.value)} />
        </td>
      )
    case 'status':
      return (
        <td key="status">
          <select className={'status-select ' + optionClass(STATUS_OPTIONS, a.status, 'st-applied')} value={a.status || 'applied'} onChange={e => onUpdate('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </td>
      )
    case 'priority':
      return (
        <td key="priority">
          <select className={'priority-select ' + optionClass(PRIORITY_OPTIONS, a.priority, 'pr-medium')} value={a.priority || 'medium'} onChange={e => onUpdate('priority', e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </td>
      )
    case 'letter': {
      const href = safeUrl(a.cover_letter_link)
      return (
        <td key="letter" style={{ textAlign: 'center' }}>
          {href
            ? <a className="letter-link" href={href} target="_blank" rel="noopener noreferrer" title="Open cover letter" onClick={e => e.stopPropagation()}><i className="ti ti-file-text" /></a>
            : <span className="letter-link-empty">—</span>}
        </td>
      )
    }
    default:
      return <td key={col.key}></td>
  }
}
