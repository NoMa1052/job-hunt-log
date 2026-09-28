// Design tokens: plain, platform-neutral values (no CSS, no DOM).
// The web app's source of truth is src/styles/sidekick.css; this file mirrors
// its :root values (a test keeps them in sync) so the Expo app and the icon
// generator can use them without CSS.

export const color = {
  canvas: '#F4F5F9',
  surface: '#FFFFFF',
  surfaceSunken: '#ECEEF4',
  line: '#DCDFE8',
  lineStrong: '#8A8FA8',
  ink: '#1C1E3A',
  inkMuted: '#585D78',
  indigo: '#2A2F6E',
  indigoStrong: '#1F2358',
  indigoTint: '#E7E8F5',
  amber: '#F2A73B', // follow-up signal only
  amberTint: '#FDF1DC',
  amberInk: '#8A4B00',
  statusAppliedBg: '#E7E8F5',
  statusAppliedInk: '#2A2F6E',
  statusInterviewBg: '#DDE9F8',
  statusInterviewInk: '#1E4F86',
  statusOfferBg: '#DCF0E4',
  statusOfferInk: '#1B6340',
  statusRejectedBg: '#F8E4E1',
  statusRejectedInk: '#9B2F27',
  statusClosedBg: '#ECEEF4',
  statusClosedInk: '#585D78',
  danger: '#9B2F27',
}

export const font = {
  display: 'Fraunces', // wordmark and display numbers
  sans: 'Instrument Sans', // UI text
}

export const fontStack = {
  display: '"Fraunces", Georgia, serif',
  sans: '"Instrument Sans", system-ui, sans-serif',
}

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 }

export const radius = { sm: 6, md: 10, lg: 16, full: 999 }

export const shadow = {
  tab: '0 1px 2px rgba(28,30,58,0.10)',
  pop: '0 8px 24px rgba(28,30,58,0.14)',
}

// Logo mark, matching src/assets/sidekick-mark.svg (viewBox 0 0 120 120).
// Heavier stroke and larger dot at favicon sizes.
export const mark = {
  viewBox: 120,
  tileRadius: 28,
  colors: { tile: '#2A2F6E', stroke: '#F7F4EE', dot: '#F2A73B' },
  path: 'M31 81 C31 45 59 45 59 61 C59 77 87 77 87 41',
  dot: { cx: 87, cy: 41 },
  regular: { strokeWidth: 16, dotRadius: 10 },
  small: { strokeWidth: 18, dotRadius: 11 },
  smallMaxPx: 48,
}
