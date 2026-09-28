import { Button } from '../ui'

// The delete action at the bottom of a detail panel.
export default function PanelDelete({ label, onDelete }) {
  return (
    <section className="panel-danger" aria-label={label}>
      <Button variant="danger" size="sm" icon="trash" onClick={onDelete}>{label}</Button>
    </section>
  )
}
