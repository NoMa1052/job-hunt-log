// Sidekick design tokens: plain, platform-neutral values (no CSS, no DOM).
// The web app mirrors them as CSS variables in src/styles/tokens.css (a test
// keeps the two in sync); the Expo app can import this file directly.

export const color = {
  ink: '#17191C', // text, dark surfaces
  inkSoft: '#5C5F66',
  inkFaint: '#9A9CA1',
  paper: '#F7F4EE', // page background
  paperSunken: '#EFEAE1',
  card: '#FFFFFF', // cards sit on paper
  border: 'rgba(23,25,28,0.08)',
  borderStrong: 'rgba(23,25,28,0.16)',
  teal: '#1F6F62', // primary accent, logo tile
  tealDark: '#185A4F',
  spark: '#F2A73B', // single highlight; use sparingly
  overlay: 'rgba(23,25,28,0.45)',

  // Status tones (semantic, not brand)
  amber: '#8F631A',
  amberBg: '#EFDDAE',
  green: '#2F5C41',
  greenBg: '#D2E3D6',
  red: '#833B29',
  redDark: '#6F3020',
  redBg: '#EAD2C5',
  blueBg: '#D7E1EA',
}

export const font = {
  display: 'Fraunces', // wordmark and display headings, weight 600
  ui: 'Space Grotesk', // UI and labels, weights 400/500/600
}

export const fontStack = {
  display: `'${font.display}', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif`,
  ui: `'${font.ui}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
}

export const fontWeight = { regular: 400, medium: 500, semibold: 600 }

export const wordmark = { weight: 600, letterSpacing: '-0.01em' }

export const radius = {
  card: 20,
  control: 10,
  pill: 999,
  tileRatio: 0.24, // logo tile corner radius as a fraction of tile size
}

export const shadow = {
  popover: '0 6px 18px rgba(23,25,28,0.12)',
  modal: '0 20px 50px rgba(23,25,28,0.22)',
}

// Logo mark geometry (viewBox 0 0 120 120). Thicker stroke and larger dot at
// favicon sizes so the mark stays legible.
export const mark = {
  viewBox: 120,
  path: 'M31 81 C31 45 59 45 59 61 C59 77 87 77 87 41',
  dot: { cx: 87, cy: 41 },
  regular: { strokeWidth: 16, dotRadius: 10 },
  small: { strokeWidth: 18, dotRadius: 11 },
  smallMaxPx: 48,
}
