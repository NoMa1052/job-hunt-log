import { mark } from './tokens'

// The mark on its rounded-square tile (same art as src/assets/sidekick-mark.svg). Uses the heavier stroke at small
// sizes so it holds up as a favicon or in dense UI.
export function LogoMark({ size = 32, title }) {
  const g = size <= mark.smallMaxPx ? mark.small : mark.regular
  const labelled = Boolean(title)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${mark.viewBox} ${mark.viewBox}`}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <rect width={mark.viewBox} height={mark.viewBox} rx={mark.tileRadius} fill={mark.colors.tile} />
      <path d={mark.path} fill="none" stroke={mark.colors.stroke} strokeWidth={g.strokeWidth} strokeLinecap="round" />
      <circle cx={mark.dot.cx} cy={mark.dot.cy} r={g.dotRadius} fill={mark.colors.dot} />
    </svg>
  )
}

// variant: 'light' (mark + ink wordmark), 'reversed' (on ink), 'icon', 'wordmark'.
// size: tile size in px; the wordmark scales with it.
export default function Logo({ variant = 'light', size = 32, wordmark, className = '' }) {
  if (variant === 'icon') return <LogoMark size={size} title={wordmark} />
  const text = <span className="ui-wordmark" style={{ fontSize: Math.round(size * 0.82) }}>{wordmark}</span>
  if (variant === 'wordmark') {
    return <span className={`ui-logo ui-logo--wordmark ${className}`.trim()}>{text}</span>
  }
  return (
    <span className={`ui-logo ui-logo--${variant} ${className}`.trim()} style={{ gap: Math.round(size * 0.3) }}>
      <LogoMark size={size} />
      {text}
    </span>
  )
}
