// tone: neutral | blue | amber | green | red | teal | spark
export default function Badge({ tone = 'neutral', className = '', children }) {
  return <span className={`ui-badge ui-tone--${tone} ${className}`.trim()}>{children}</span>
}
