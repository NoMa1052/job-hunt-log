import { useState } from 'react'
import { Button, ConfirmDialog, Icon, IconButton, Popover } from '../../ui'
import NameForm from './NameForm'

export const ALL_VIEW = 'all'

// Saved views as tabs. "All applications" is built in; changes to it are
// temporary until saved as a view. Changes to a saved view save themselves.
export default function ViewTabs({ views, activeId, allDirty, disabled, onSelect, onCreate, onRename, onDelete, onDuplicate }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const tabs = [{ id: ALL_VIEW, name: 'All applications' }, ...views]
  const active = views.find(v => v.id === activeId)

  return (
    <div className="views-bar">
      <div className="views-tabs" role="tablist" aria-label="Saved views">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === activeId}
            className="view-tab"
            onClick={() => onSelect(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="views-actions">
        {activeId === ALL_VIEW && allDirty && !disabled && (
          <Popover align="end" trigger={({ open, toggle }) => <Button variant="secondary" size="sm" onClick={toggle} aria-expanded={open}>Save as view</Button>}>
            {({ close }) => <NameForm label="View name" submitLabel="Save view" onCancel={close} onSubmit={name => { close(); onCreate(name) }} />}
          </Popover>
        )}
        {active && (
          <Popover
            align="end"
            trigger={({ open, toggle }) => <IconButton icon="more" size="sm" label={`Options for ${active.name}`} aria-expanded={open} onClick={toggle} />}
          >
            {({ close }) => <ViewMenu view={active} close={close} onRename={onRename} onDuplicate={onDuplicate} onAskDelete={() => { close(); setConfirmDelete(active) }} />}
          </Popover>
        )}
        {!disabled && (
          <Popover align="end" trigger={({ open, toggle }) => <Button variant="ghost" size="sm" icon="plus" onClick={toggle} aria-expanded={open}>New view</Button>}>
            {({ close }) => <NameForm label="New view name" submitLabel="Create view" onCancel={close} onSubmit={name => { close(); onCreate(name) }} />}
          </Popover>
        )}
      </div>
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete the view "${confirmDelete.name}"? Your applications aren't affected.`}
          onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function ViewMenu({ view, close, onRename, onDuplicate, onAskDelete }) {
  const [renaming, setRenaming] = useState(false)
  if (renaming) {
    return <NameForm label="Rename view" initial={view.name} submitLabel="Rename" onCancel={close} onSubmit={name => { close(); onRename(view.id, name) }} />
  }
  return (
    <div role="menu" aria-label={`${view.name} options`}>
      <button type="button" role="menuitem" className="menu-item" autoFocus onClick={() => setRenaming(true)}>Rename</button>
      <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onDuplicate(view) }}>Duplicate</button>
      <button type="button" role="menuitem" className="menu-item menu-item--danger" onClick={onAskDelete}><Icon name="x" size={14} /> Delete view</button>
    </div>
  )
}
