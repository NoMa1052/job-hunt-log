import { useState } from 'react'
import { ConfirmDialog, Icon, IconButton, Popover } from '../../ui'
import NameForm from './NameForm'

export const ALL_VIEW = 'all'

// Saved views as tabs. The "All" view is built in; changes to it are
// temporary until saved as a view (from Customize). Changes to a saved view
// save themselves. onSetDefault is left out until per-tab defaults exist.
export default function ViewTabs({ views, activeId, allLabel, noun, defaultId, onSelect, onRename, onDelete, onDuplicate, onSetDefault }) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const tabs = [{ id: ALL_VIEW, name: allLabel }, ...views]
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
            {t.id === defaultId && <span className="view-default">Default</span>}
          </button>
        ))}
      </div>
      <div className="views-actions">
        {active && (
          <Popover
            align="end"
            trigger={({ open, toggle }) => <IconButton icon="more" size="sm" label={`Options for ${active.name}`} aria-expanded={open} onClick={toggle} />}
          >
            {({ close }) => <ViewMenu view={active} isDefault={active.id === defaultId} close={close} onRename={onRename} onDuplicate={onDuplicate} onSetDefault={onSetDefault} onAskDelete={() => { close(); setConfirmDelete(active) }} />}
          </Popover>
        )}
      </div>
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete the view "${confirmDelete.name}"? Your ${noun} aren't affected.`}
          onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function ViewMenu({ view, isDefault, close, onRename, onDuplicate, onSetDefault, onAskDelete }) {
  const [renaming, setRenaming] = useState(false)
  if (renaming) {
    return <NameForm label="Rename view" initial={view.name} submitLabel="Rename" onCancel={close} onSubmit={name => { close(); onRename(view.id, name) }} />
  }
  return (
    <div role="menu" aria-label={`${view.name} options`}>
      <button type="button" role="menuitem" className="menu-item" autoFocus onClick={() => setRenaming(true)}>Rename</button>
      <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onDuplicate(view) }}>Duplicate</button>
      {onSetDefault && (
        <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); onSetDefault(isDefault ? null : view.id) }}>
          {isDefault ? "Don't open first" : 'Open this view first'}
        </button>
      )}
      <button type="button" role="menuitem" className="menu-item menu-item--danger" onClick={onAskDelete}><Icon name="x" size={14} /> Delete view</button>
    </div>
  )
}

// The tabs row wired to useViewState, plus a note when views are off.
export function ViewsBar({ state, allLabel, noun }) {
  const { tableViews } = state
  return (
    <>
      <ViewTabs
        views={tableViews.views}
        activeId={state.activeId}
        allLabel={allLabel}
        noun={noun}
        defaultId={state.defaultViewId}
        onSelect={state.selectView}
        onRename={tableViews.rename}
        onDuplicate={state.duplicateView}
        onDelete={state.deleteView}
        onSetDefault={tableViews.perTabDefaults ? tableViews.setDefault : undefined}
      />
      {state.viewsUnavailable && <p className="views-note" role="status">Saved views aren't available here right now. Changes to columns, sorting and filters last until you leave the page.</p>}
    </>
  )
}
