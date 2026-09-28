// White card on paper: 1px border, 20px radius.
export default function Card({ as: Tag = 'div', padded = true, className = '', children, ...props }) {
  return <Tag className={`ui-card ${padded ? 'ui-card--padded' : ''} ${className}`.trim()} {...props}>{children}</Tag>
}
