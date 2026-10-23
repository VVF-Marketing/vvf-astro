import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Links to other websites open in a new tab, with noopener and a screen-reader
// cue in the page's language (openspec/changes/open-external-links-in-new-tab).
const CUE = { en: '(opens in a new tab)', es: '(se abre en una pestaña nueva)' }
const SITE = /^(?:https?:)?\/\/(?:www\.)?victoriavenezuelafoundation\.org(?:[/?#:]|$)/i
const isExternal = (href: string) => /^(?:https?:)?\/\//i.test(href) && !SITE.test(href)

const pages: [string, keyof typeof CUE][] = [
  ['/', 'en'],
  ['/es', 'es'],
  ['/ways-to-give', 'en'],
  ['/events/2026-golf-tournament', 'en'],
]

for (const [path, locale] of pages) {
  test(`external links on ${path} open in a new tab and say so`, async ({ page }) => {
    await page.goto(path)
    const links = await page.locator('a[href]').evaluateAll((els) =>
      els.map((a) => ({ href: a.getAttribute('href') ?? '', target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? '', label: a.getAttribute('aria-label'), text: a.textContent ?? '' }))
    )
    const external = links.filter((l) => isExternal(l.href))
    expect(external.length).toBeGreaterThan(0)
    for (const l of external) {
      expect(l.target, l.href).toBe('_blank')
      expect(l.rel.split(/\s+/), l.href).toContain('noopener')
      expect((l.label ?? l.text).trim().endsWith(CUE[locale]), l.href).toBe(true)
    }
    // Same-site, anchor, mailto and tel links keep the same tab.
    for (const l of links.filter((l) => !isExternal(l.href))) expect(l.target, l.href).toBeNull()
  })
}

test('the cue is announced but not shown', async ({ page }) => {
  await page.goto('/')
  const external = page.locator('a[href^="http"]:not([href*="victoriavenezuelafoundation.org"])').first()
  await expect(external.locator('.sr-only')).toHaveCount(1)
  await expect(external.locator('.sr-only')).toHaveCSS('position', 'absolute')
  await expect(external.locator('.sr-only')).toHaveCSS('width', '1px')
})

test('no page in the sitemap has an external link that stays in the same tab', async ({ request }) => {
  const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf-8'))
  const paths: string[] = [...read('../scripts/migrate/snapshot/sitemap.json').urls, ...read('../scripts/migrate/snapshot/es/sitemap.json').urls]
  const failures: string[] = []
  let pagesChecked = 0
  let externalChecked = 0
  for (const path of paths) {
    const res = await request.get(path)
    if (!res.ok() || !res.headers()['content-type']?.includes('text/html')) continue
    pagesChecked++
    for (const tag of (await res.text()).match(/<a\b[^>]*>/gi) ?? []) {
      const href = tag.match(/\shref\s*=\s*(["'])(.*?)\1/i)?.[2]
      if (!href || !isExternal(href)) continue
      externalChecked++
      if (!/\starget\s*=/i.test(tag)) failures.push(`${path}: ${href}`)
    }
  }
  expect(failures).toEqual([])
  // Guard against a vacuous pass: most sitemap pages render and carry external links.
  expect(pagesChecked).toBeGreaterThan(paths.length * 0.9)
  expect(externalChecked).toBeGreaterThan(500)
})
