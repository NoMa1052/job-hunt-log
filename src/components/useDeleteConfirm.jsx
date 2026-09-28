import { useState } from 'react'
import { useData } from '../state/DataProvider'
import { ConfirmDialog } from '../ui'

// Ask before deleting, then delete with a few seconds to undo.
// ask('applications', id, 'application', { then }) opens the dialog; render
// `dialog` somewhere on the page.
export default function useDeleteConfirm() {
  const { removeWithUndo } = useData()
  const [pending, setPending] = useState(null)

  const ask = (name, id, noun, { then, extra = '' } = {}) => setPending({ name, id, noun, then, extra })
  const dialog = pending && (
    <ConfirmDialog
      message={`Delete this ${pending.noun}?${pending.extra} You'll have a few seconds to undo it.`}
      confirmLabel={`Delete ${pending.noun}`}
      onConfirm={() => {
        const { name, id, noun, then } = pending
        setPending(null)
        then?.()
        removeWithUndo(name, id, `${noun[0].toUpperCase()}${noun.slice(1)} deleted.`)
      }}
      onCancel={() => setPending(null)}
    />
  )
  return { ask, dialog }
}
