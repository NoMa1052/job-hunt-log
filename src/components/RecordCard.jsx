// One row of a list, as a card, for phones (the table is hidden there).
// Tapping it opens the detail view.
//   title / aside: line 1 (bold title, something aligned right)
//   body:          line 2, up to two lines
//   meta / end:    line 3 (small meta text, an indicator aligned right)
export default function RecordCard({ title, aside, body, meta, end, label, selected, onOpen }) {
  return (
    <li>
      <button type="button" className="record-card" aria-label={label} aria-current={selected ? 'true' : undefined} onClick={onOpen}>
        <span className="record-card-top">
          <span className="record-card-title">{title}</span>
          {aside}
        </span>
        {body && <span className="record-card-body">{body}</span>}
        {(meta || end) && (
          <span className="record-card-meta">
            <span className="record-card-meta-text">{meta}</span>
            {end}
          </span>
        )}
      </button>
    </li>
  )
}
