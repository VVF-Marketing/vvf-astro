import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import tokens from './tokens.cjs'
import config from '../../tailwind.config.cjs'

// Colours live in src/styles/tokens.cjs only (spec 5.9, check 2): components
// use Tailwind classes or the CSS variables, never a literal.
const SRC = path.resolve(__dirname, '..')
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]))

describe('colour tokens', () => {
  it('are the only colour literals in components, pages, layouts and CSS', () => {
    const offenders = files(SRC)
      .filter((f) => /\.(astro|css)$/.test(f) || (/\.ts$/.test(f) && /\/(components|pages|layouts)\//.test(f) && !/\.(test|stories)\.ts$/.test(f)))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ line: line.replace(/\/\/.*$|\/\*.*?\*\/|<!--.*?-->/g, ''), at: `${path.relative(SRC, f)}:${i + 1}` }))
          .filter(({ line }) => /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b(?![\w-])|rgba?\(\s*\d/i.test(line) && !/href=|url\(#|['"`]#[a-z][\w-]*['"`]/i.test(line))
          .map(({ at }) => at)
      )
    expect(offenders).toEqual([])
  })

  it('feed the Tailwind palette', () => {
    const colors = config.theme.colors
    expect(colors.brand).toEqual({ primary: tokens.colors.navy, accent: tokens.colors.blue, 'accent-text': tokens.colors['blue-text'] })
    expect(colors.focus).toEqual({ DEFAULT: tokens.focus.outline, inner: tokens.focus.inner })
  })

  // Q13 on the spec card: `blue-text` passes WCAG AA (4.5:1) on white and on
  // `page`; Q12: the focus ring's inner `navy` passes 3:1 against both.
  it('keep the contrast the spec card decided', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
    const { colors: c, focus } = tokens
    expect(ratio(c['blue-text'], c.white)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c['blue-text'], c.page)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(focus.inner, c.white)).toBeGreaterThanOrEqual(3)
    expect(ratio(focus.inner, focus.outline)).toBeGreaterThanOrEqual(3)
  })
})
