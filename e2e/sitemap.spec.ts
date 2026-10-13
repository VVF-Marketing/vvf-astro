import { expect, test } from '@playwright/test'

// /sitemap.xml lists every canonical page in both languages (src/lib/sitemap.ts).
test('every sitemap URL is a live, canonical page, and child profiles stay out', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  expect(locs.length).toBeGreaterThan(20)
  expect(locs).toContain('/')
  expect(locs).toContain('/es')
  expect(locs.some((p) => /^\/(es\/)?events\/.+/.test(p))).toBe(true)
  expect(locs.filter((p) => /\/sponsor-a-child\/children\/./.test(p))).toEqual([])

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
