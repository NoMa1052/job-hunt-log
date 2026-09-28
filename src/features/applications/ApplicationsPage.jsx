import { useEffect, useRef, useState } from 'react'
import { useData } from '../../state/DataProvider'
import { loadPref, savePref } from '../../lib/storage'
import { safeUrl } from '../../lib/url'
import { toCSV, downloadCSV } from '../../lib/format'
import { ConfirmDialog, DateCell, EditableCell, EditableLinkCell, FilterPopover, Icon, Popover, SelectCell } from '../../ui'
import CollectionState from '../../components/CollectionState'
import ApplicationModal from './ApplicationModal'
import { ALL_COLUMNS, DEFAULT_ORDER, DEFAULT_HIDDEN, EXPORT_HEADERS, passesFilters } from './options'

export default function ApplicationsPage() {
  const { userId, data, add, update, remove, reload } = useData()
  const applications = data.applications.rows

  const [columnOrder, setColumnOrder] = useState(() => loadPref(userId, 'col-order', DEFAULT_ORDER))
  const [hiddenCols, setHiddenCols] = useState(() => new Set(loadPref(userId, 'hidden-cols', DEFAULT_HIDDEN)))
  const [colFilters, setColFilters] = useState(() => loadPref(userId, 'col-filters', {}))
  const [editingAppId, setEditingAppId] = useState(null)
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
          <Popover
            align="end"
            className="manage-cols-popover"
            trigger={({ toggle }) => <button className="add-btn secondary" onClick={toggle}>Columns</button>}
          >
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
                      <span className="drag-handle"><Icon name="grip" size={14} /></span>
                      <label className="ui-popover-row" style={{ flex: 1 }}>
                        <input type="checkbox" checked={!hiddenCols.has(key)} onChange={() => hiddenCols.has(key) ? showColumn(key) : hideColumn(key)} />
                        {col.label}
                      </label>
                    </div>
                  )
                })}
          </Popover>
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
                  {col.type === 'text' && (
                    <FilterPopover label={col.label} value={colFilters[col.key]} onChange={v => setTextFilter(col.key, v)} />
                  )}
                  {col.type === 'select' && (
                    <FilterPopover label={col.label} options={col.options} selected={colFilters[col.key]} onToggle={v => toggleSelectFilter(col.key, v, col.options)} />
                  )}
                  {col.type !== 'text' && col.type !== 'select' && <span className="col-label-plain">{col.label}</span>}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map(a => (
              <tr key={a.id} className="app-row">
                <td className="expand-cell" onClick={() => setEditingAppId(a.id)} title="Open full details">
                  <Icon name="expand" size={14} className="expand-icon" />
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
      return <EditableLinkCell key="position" value={a.position} href={safeUrl(a.link)} placeholder="Position" title="Opens where you applied — double-click to rename" onSave={v => onUpdate('position', v)} />
    case 'location': case 'source': case 'salary': case 'hiring_manager': case 'connections':
      return <EditableCell key={col.key} value={a[col.key]} placeholder="—" onSave={v => onUpdate(col.key, v)} />
    case 'date_applied': case 'follow_up_date': case 'interview_date':
      return <DateCell key={col.key} value={a[col.key]} onChange={v => onUpdate(col.key, v)} />
    case 'status':
    case 'priority':
      return <SelectCell key={col.key} label={col.label} options={col.options} value={a[col.key] || (col.key === 'status' ? 'applied' : 'medium')} onChange={v => onUpdate(col.key, v)} />
    case 'letter': {
      const href = safeUrl(a.cover_letter_link)
      return (
        <td key="letter" style={{ textAlign: 'center' }}>
          {href
            ? <a className="letter-link" href={href} target="_blank" rel="noopener noreferrer" title="Open cover letter"><Icon name="file-text" /></a>
            : <span className="letter-link-empty">—</span>}
        </td>
      )
    }
    default:
      return <td key={col.key}></td>
  }
}
