// Status chip. kind: applied | interviewing | offer | rejected | closed
export default function Chip({ kind, children }) {
  return <span className={`sk-chip sk-chip--${kind}`}>{children}</span>
}
