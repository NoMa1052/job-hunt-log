// Generates the favicon and app icons from the logo mark in src/ui/tokens.js.
// Run after changing the mark or brand colors: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { mark } from '../src/ui/tokens.js'

const V = mark.viewBox

// rounded: tile with the brand corner radius (transparent corners).
// square: full-bleed tile for platforms that apply their own mask; `inset`
// shrinks the mark to keep it inside maskable-icon safe zones.
function svg({ small, rounded = true, inset = 1 }) {
  const g = small ? mark.small : mark.regular
  const rx = rounded ? mark.tileRadius : 0
  const t = (1 - inset) * V / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}">
  <rect width="${V}" height="${V}" rx="${rx}" fill="${mark.colors.tile}"/>
  <g transform="translate(${t} ${t}) scale(${inset})">
    <path d="${mark.path}" fill="none" stroke="${mark.colors.stroke}" stroke-width="${g.strokeWidth}" stroke-linecap="round"/>
    <circle cx="${mark.dot.cx}" cy="${mark.dot.cy}" r="${g.dotRadius}" fill="${mark.colors.dot}"/>
  </g>
</svg>
`
}

function png(file, size, opts) {
  const out = new Resvg(svg(opts), { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(file, out)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/favicon.svg', svg({ small: true }))
png('public/icons/favicon-32.png', 32, { small: true })
png('public/icons/icon-192.png', 192, { small: false })
png('public/icons/icon-512.png', 512, { small: false })
png('public/icons/apple-touch-icon.png', 180, { small: false, rounded: false, inset: 0.84 })
png('public/icons/icon-maskable-512.png', 512, { small: false, rounded: false, inset: 0.72 })
console.log('icons written to public/')
