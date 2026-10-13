import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findLiteralCopy } from './copyLint'

const PAGES_DIR = path.join(process.cwd(), 'src/pages')
const SRC_DIR = path.join(process.cwd(), 'src')

// Static pages (not collection detail templates, whose text comes from the CMS item).
// Every page file: static pages and collection detail templates (whose fixed
// text lives in their `_copy.detail.ts`).
const pages = (readdirSync(PAGES_DIR, { recursive: true }) as string[])
  .map((f) => f.split(path.sep).join('/'))
  .filter((f) => f.endsWith('.astro'))

describe('pages keep their copy in slots', () => {
  it.each(pages)('%s has no literal visible copy', (file) => {
    expect(findLiteralCopy(readFileSync(path.join(PAGES_DIR, file), 'utf8'))).toEqual([])
  })

  it('flags a planted literal', () => {
    const page = `---\nconst x = 1\n---\n<Hero heading={copy['hero.heading']} imageAlt="A child smiling" />\n<p>Hardcoded text</p>\n<Button>{copy['cta']}</Button>\n<p>Last updated {date}</p>\n<script>const a = document.querySelector<HTMLElement>('x')</script>`
    expect(findLiteralCopy(page).map((f) => f.text)).toEqual(['A child smiling', 'Hardcoded text', 'Last updated'])
  })

  it('flags copy fields in object literals', () => {
    expect(findLiteralCopy(`---\nconst cards = [{ title: 'General inquiries', topic: 'general' }, { label: "Let's check" }]\n---\n`)).toEqual([
      { line: 2, text: 'General inquiries' },
      { line: 2, text: "Let's check" },
    ])
  })
})

describe('copy is never rendered as raw HTML', () => {
  const files = (readdirSync(SRC_DIR, { recursive: true }) as string[]).filter((f) => f.endsWith('.astro'))
  it.each(files)('%s passes no copy value to set:html', (file) => {
    const source = readFileSync(path.join(SRC_DIR, file), 'utf8')
    expect(source).not.toMatch(/set:html=\{\s*(copy|t)\[/)
  })
})
