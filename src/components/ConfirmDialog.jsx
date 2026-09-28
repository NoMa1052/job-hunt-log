export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="add-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="add-btn danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
