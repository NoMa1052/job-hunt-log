import Icon from './Icon'

// variant: primary | secondary | danger | ghost | link. size: sm | md.
export default function Button({ variant = 'secondary', size = 'md', icon, type = 'button', className = '', children, ...props }) {
  return (
    <button type={type} className={`ui-btn ui-btn--${variant} ui-btn--${size} ${className}`.trim()} {...props}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
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
