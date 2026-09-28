import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} size="sm" role="alertdialog">
      <p className="ui-confirm-message">{message}</p>
      <div className="ui-confirm-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} autoFocus>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
