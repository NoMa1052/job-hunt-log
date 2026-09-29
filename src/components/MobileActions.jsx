import { useEffect, useState } from 'react'
import { Button, Popover } from '../ui'
import { CustomizePanel } from '../features/views/CustomizeMenu'

// The phone version of a page's actions: the main action on the left and
// one "More" menu on the right (Customize, Export, …). Hidden on desktop,
// where the page shows its full set of buttons instead.
//   primary:   the main button
//   customize: CustomizeMenu props, adds "Customize" (opens a bottom sheet)
//   items:     [{ label, onSelect }] for the rest of the menu
export default function MobileActions({ primary, customize, items = [] }) {
  const [sheet, setSheet] = useState(false)
  const menu = [
    ...(customize ? [{ label: customize.config.filters.length ? `Customize · ${customize.config.filters.length}` : 'Customize', onSelect: () => setSheet(true) }] : []),
    ...items,
  ]
  return (
    <div className="page-actions-mobile">
      {primary}
      {menu.length > 0 && (
        <Popover
          align="end"
          className="more-menu"
          trigger={({ open, toggle }) => <Button icon="more" onClick={toggle} aria-expanded={open} aria-haspopup="menu">More</Button>}
        >
          {({ close }) => (
            <div role="menu" aria-label="More actions">
              {menu.map(m => (
                <button key={m.label} type="button" role="menuitem" className="menu-item" onClick={() => { close(); m.onSelect() }}>{m.label}</button>
              ))}
            </div>
          )}
        </Popover>
      )}
      {sheet && (
        <BottomSheet label="Customize" onClose={() => setSheet(false)}>
          <CustomizePanel {...customize} close={() => setSheet(false)} />
        </BottomSheet>
      )}
    </div>
  )
}

function BottomSheet({ label, onClose, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-head">
          <h2 className="sheet-title">{label}</h2>
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>
        {children}
      </div>
    </div>
  )
}
