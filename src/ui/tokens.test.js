import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { color, fontStack, radius, shadow } from './tokens'

// Tests run from the repo root.
const css = readFileSync('src/styles/tokens.css', 'utf8')
const cssVar = name => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return m && m[1].trim()
}
const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase())

describe('tokens.css mirrors tokens.js', () => {
  it('has every color', () => {
    for (const [k, v] of Object.entries(color)) expect(cssVar(`sk-${kebab(k)}`), k).toBe(v)
  })
  it('has the font stacks, radii and shadows', () => {
    expect(cssVar('sk-font-display')).toBe(fontStack.display)
    expect(cssVar('sk-font-ui')).toBe(fontStack.ui)
    expect(cssVar('sk-radius-card')).toBe(`${radius.card}px`)
    expect(cssVar('sk-radius-control')).toBe(`${radius.control}px`)
    expect(cssVar('sk-shadow-popover')).toBe(shadow.popover)
    expect(cssVar('sk-shadow-modal')).toBe(shadow.modal)
  })
  it('uses the brand values from the spec', () => {
    expect(color).toMatchObject({ ink: '#17191C', paper: '#F7F4EE', card: '#FFFFFF', teal: '#1F6F62', spark: '#F2A73B', border: 'rgba(23,25,28,0.08)' })
    expect(radius.card).toBe(20)
  })
})
