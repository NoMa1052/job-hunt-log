import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { color, fontStack, radius, shadow, space, mark } from './tokens'

// Tests run from the repo root.
const css = readFileSync('src/styles/sidekick.css', 'utf8')
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')))
const raw = name => {
  const m = root.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return m && m[1].trim()
}
// Follow var(--x) references to the literal value.
const resolve = name => {
  let v = raw(name)
  for (let i = 0; v && i < 5; i++) {
    const ref = /^var\(--([a-z0-9-]+)\)$/.exec(v)
    if (!ref) break
    v = raw(ref[1])
  }
  return v
}
const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
const cssName = key => {
  const k = kebab(key)
  // tokens.js uses statusInterview*/statusClosed* for the CSS status-interview-*/status-closed-*
  return k
}

describe('tokens.js mirrors sidekick.css', () => {
  it('has every color', () => {
    for (const [k, v] of Object.entries(color)) expect(resolve(cssName(k)), k).toBe(v)
  })
  it('has the font stacks, spacing, radii and shadows', () => {
    expect(raw('font-display')).toBe(fontStack.display)
    expect(raw('font-sans')).toBe(fontStack.sans)
    for (const [k, v] of Object.entries(space)) expect(raw(`space-${k}`), `space-${k}`).toBe(`${v}px`)
    for (const [k, v] of Object.entries(radius)) expect(raw(`radius-${k}`), `radius-${k}`).toBe(`${v}px`)
    expect(raw('shadow-tab')).toBe(shadow.tab)
    expect(raw('shadow-pop')).toBe(shadow.pop)
  })
})

describe('logo mark', () => {
  it('matches src/assets/sidekick-mark.svg', () => {
    const svg = readFileSync('src/assets/sidekick-mark.svg', 'utf8')
    expect(svg).toContain(`rx="${mark.tileRadius}" fill="${mark.colors.tile}"`)
    expect(svg).toContain(`d="${mark.path}" stroke="${mark.colors.stroke}" stroke-width="${mark.regular.strokeWidth}"`)
    expect(svg).toContain(`r="${mark.regular.dotRadius}" fill="${mark.colors.dot}"`)
  })
})
