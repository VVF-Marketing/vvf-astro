import { expect, test } from '@playwright/test'

// /sitemap.xml lists every canonical page in both languages (src/lib/sitemap.ts).
// Child profiles are listed too (spec 2.4, Q1); detail pages carry the date
// their content last changed.
test('every sitemap URL is a live, canonical page, child profiles included', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  expect(locs.length).toBeGreaterThan(20)
  expect(locs).toContain('/')
  expect(locs).toContain('/es')
  expect(locs.some((p) => /^\/(es\/)?events\/.+/.test(p))).toBe(true)
  const children = await (await request.get('/children')).text()
  const childLink = children.match(/href="(\/children\/[^"]+)"/)?.[1]
  if (childLink) expect(locs).toContain(childLink)
  for (const m of xml.matchAll(/<url><loc>[^<]*\/events\/[^<]+<\/loc>(<lastmod>[^<]*<\/lastmod>)?/g)) {
    expect(m[1], `${m[0]} has a lastmod`).toMatch(/^<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>$/)
  }

  const problems: string[] = []
  for (const path of locs) {
    const res = await request.get(path, { maxRedirects: 0 })
    if (res.status() !== 200) {
      problems.push(`${path} (${res.status()})`)
      continue
    }
    const canonical = (await res.text()).match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    if (!canonical || new URL(canonical).pathname !== path) problems.push(`${path} canonical ${canonical}`)
  }
  expect(problems).toEqual([])
})
