// Small inline SVG icon set (replaces the Tabler icon webfont from a CDN).
const PATHS = {
  'external-link': ['M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6', 'M11 13l9-9', 'M15 4h5v5'],
  'file-text': ['M14 3v4a1 1 0 0 0 1 1h4', 'M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z', 'M9 9h1', 'M9 13h6', 'M9 17h6'],
  notes: ['M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M9 7h6', 'M9 11h6', 'M9 15h4'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  expand: ['M16 4h4v4', 'M14 10l6-6', 'M8 20H4v-4', 'M4 20l6-6'],
  pencil: ['M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4', 'M13.5 6.5l4 4'],
  grip: ['M9 5h.01', 'M9 12h.01', 'M9 19h.01', 'M15 5h.01', 'M15 12h.01', 'M15 19h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  download: ['M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2', 'M7 11l5 5 5-5', 'M12 4v12'],
  columns: ['M4 4h6v16H4z', 'M14 4h6v16h-6z'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  'arrow-up': ['M12 19V5', 'M6 11l6-6 6 6'],
  'arrow-down': ['M12 5v14', 'M6 13l6 6 6-6'],
  'sort-asc': ['M12 19V5', 'M6 11l6-6 6 6'],
  'sort-desc': ['M12 5v14', 'M6 13l6 6 6-6'],
}

export default function Icon({ name, size = 16, title, className = '' }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'grip' || name === 'more' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {d.map(p => <path key={p} d={p} />)}
    </svg>
  )
}
