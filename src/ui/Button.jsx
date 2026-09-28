import Icon from './Icon'

// variant: primary (one main action per view) | secondary | ghost | danger | link.
// size: md | sm.
export default function Button({ variant = 'secondary', size = 'md', icon, type = 'button', className = '', children, ...props }) {
  const classes = variant === 'link'
    ? 'ui-btn--link'
    : `sk-btn ${variant === 'danger' ? 'ui-btn--danger' : `sk-btn--${variant}`} ${size === 'sm' ? 'ui-btn--sm' : ''}`
  return (
    <button type={type} className={`${classes} ${className}`.replace(/\s+/g, ' ').trim()} {...props}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className = '', ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={`ui-icon-btn ui-icon-btn--${variant} ui-icon-btn--${size} ${className}`.trim()} {...props}>
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
    </button>
  )
}
