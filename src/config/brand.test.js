import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import brand from './brand'

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(jsx?|css|html)$/.test(name) && !/\.test\./.test(name) ? [p] : []
  })
}

describe('brand', () => {
  it('writes the product name only in src/config/brand.js', () => {
    const root = process.cwd() // tests run from the repo root
    const files = [...sourceFiles(join(root, 'src')), join(root, 'index.html')]
      .filter(f => !f.endsWith(join('config', 'brand.js')))
    const offenders = files.filter(f => {
      // File names (imports and mentions of sidekick.css / sidekick-mark.svg)
      // aren't displayed text.
      const text = readFileSync(f, 'utf8')
        .replace(/^import .*$/gm, '')
        .replace(/[\w-]+\.(css|svg|js|jsx)\b/g, '')
      return text.includes(brand.name) || text.includes(brand.wordmark)
    })
    expect(offenders).toEqual([])
  })
})
