// Spec section 2: URLs and routing (checks 2.8-x).
import { expect, test } from '@playwright/test'
import { bilingual, HAS_CHILD_DATA, NO_CHILD_DATA, inLang, LANGS, seedItems, single, SPEC_PAGES, THANK_YOU_PAGES } from './helpers'
// @ts-expect-error -- plain ESM modules
import { WEBFLOW_REDIRECTS } from '../../src/lib/legacyRoutes.mjs'
// @ts-expect-error -- plain ESM modules
import { childRedirects, readWebflowRedirects } from '../../scripts/migrate/redirects.mjs'

// One published English item of each generated page type (2.2), when the seed has one.
function firstSlug(collection: string, ok: (d: Record<string, unknown>) => boolean = () => true) {
  return seedItems(collection).find((e) => !('locale' in e && e.locale) && e.slug && ok(e.data))?.slug
}
const DETAIL_PAGES = [
  firstSlug('events') && `/events/${firstSlug('events')}`,
  HAS_CHILD_DATA && firstSlug('children', (d) => d.sponsorship_status === 'available' || Boolean(d.published)) && `/children/${firstSlug('children', (d) => d.sponsorship_status === 'available' || Boolean(d.published))}`,
  firstSlug('team_members', (d) => Boolean(d.profile_slug)) && `/our-team/${firstSlug('team_members', (d) => Boolean(d.profile_slug))}`,
  firstSlug('resources') && `/resources/${firstSlug('resources')}`,
].filter(Boolean) as string[]

const INDEXABLE_PAGES = SPEC_PAGES.filter((p) => !(THANK_YOU_PAGES as readonly string[]).includes(p))

for (const path of [...SPEC_PAGES, ...DETAIL_PAGES]) {
  bilingual('2.8-1', path, async ({ page, path }) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    expect(res.status(), `${path} answers ${res.status()} ${res.headers().location ?? ''}`).toBe(200)
  })
}

for (const path of INDEXABLE_PAGES) {
  bilingual('2.8-2', path, async ({ page, path, lang }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} must exist`).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang === 'es' ? 'es-VE' : 'en-US')
  })

  bilingual('2.8-3', path, async ({ page, path }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} must exist`).toBe(200)
    const alternates = await page.$$eval('head link[rel="alternate"][hreflang]', (ls) =>
      ls.map((l) => [l.getAttribute('hreflang'), (l as HTMLLinkElement).href] as const)
    )
    const langs = alternates.map(([l]) => l)
    for (const tag of ['en-US', 'es-VE', 'x-default']) expect(langs, `${path} hreflang ${tag}`).toContain(tag)
    for (const [, href] of alternates) {
      const target = new URL(href).pathname
      const r = await page.request.get(target, { maxRedirects: 0 })
      expect(r.status(), `hreflang target ${target}`).toBe(200)
    }
  })
}

for (const path of [...INDEXABLE_PAGES, ...DETAIL_PAGES]) {
  const esPath = inLang(path, 'es')
  test(`[2.8-4] es ${esPath}`, async ({ page }) => {
    const res = await page.goto(esPath, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${esPath} must exist`).toBe(200)
    // Page links only: skip the language switch (marked with hreflang/lang)
    // and files (paths with an extension).
    const english = await page.$$eval('a[href]:not([hreflang]):not([lang])', (as) =>
      as
        .map((a) => new URL((a as HTMLAnchorElement).href, location.href))
        .filter((u) => u.origin === location.origin && !/\.[a-z0-9]+$/i.test(u.pathname) && !u.pathname.startsWith('/_'))
        .map((u) => u.pathname)
        .filter((p) => p !== '/es' && !p.startsWith('/es/'))
    )
    expect([...new Set(english)], `English links on ${esPath}`).toEqual([])
  })
}

// 2.6: one 301 straight to the target, in both languages.
const REDIRECTS: [string, string][] = [
  ['/all-events', '/events-and-campaigns'],
  ['/sponsor-a-child-list-page', '/children'],
  ['/resources-categories/all', '/resources'],
  ['/resources-categories/stories', '/resources/stories'],
  ['/resources-categories/financials-transparency', '/resources/financials'],
  ['/resources-categories/news', '/resources/news'],
]
const teamSlug = firstSlug('team_members', (d) => Boolean(d.profile_slug))
if (teamSlug) REDIRECTS.push([`/team-members/${teamSlug}`, `/our-team/${teamSlug}`])

for (const [from, to] of REDIRECTS) {
  bilingual('2.8-5', from, async ({ page, path, lang }) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    const location = res.headers().location ?? ''
    expect(res.status(), `${path} -> ${location}`).toBe(301)
    expect(new URL(location, 'http://x').pathname.replace(/\/$/, '') || '/').toBe(inLang(to, lang))
  })
}
// Old WordPress news paths go to the Spanish News page.
for (const from of ['/noticias', '/category/noticias', '/en/noticias', '/en/category/noticias']) {
  single('2.8-5', from, async ({ page }) => {
    const res = await page.request.get(from, { maxRedirects: 0 })
    const location = res.headers().location ?? ''
    expect(res.status(), `${from} -> ${location}`).toBe(301)
    expect(new URL(location, 'http://x').pathname).toBe('/es/resources/news')
  })
}

// 2.8-6: every redirect in Webflow's list lands on a 200 in one step. The
// public ones are in the code map; those to child profiles are in the
// local seed (their old addresses carry children's full names), so they're
// checked where the gitignored Webflow export is present.
async function oneStep(page: import('@playwright/test').Page, from: string, to: string) {
  const res = await page.request.get(encodeURI(from), { maxRedirects: 0 })
  const location = res.headers().location ?? ''
  expect(res.status(), `${from} -> ${location}`).toBe(301)
  const target = new URL(location, 'http://x').pathname.replace(/\/$/, '') || '/'
  expect(target, from).toBe(to)
  const landed = await page.request.get(location, { maxRedirects: 0 })
  expect(landed.status(), `${from} -> ${to} answers`).toBe(200)
}

single('2.8-6', "Webflow's list: public redirects", async ({ page }) => {
  const rows = Object.entries(WEBFLOW_REDIRECTS as Record<string, string>)
    // The News page exists once a News article does (spec 3.1).
    .filter(([, to]) => !/\/resources\/news$/.test(to))
  expect(rows.length).toBeGreaterThan(90)
  for (const [from, to] of rows) await oneStep(page, from, to)
  // Webflow's patterns: /en/(.*) and the old list pages.
  await oneStep(page, '/en/our-team', '/our-team')
  await oneStep(page, '/sponsor/page/2', '/children')
})

single('2.8-6', "Webflow's list: child profiles", async ({ page }) => {
  const rows = childRedirects(readWebflowRedirects()) as { source: string; destination: string }[]
  test.skip(!HAS_CHILD_DATA || rows.length === 0, 'blocked: the Webflow export and child data are local-only')
  for (const r of rows) await oneStep(page, r.source, r.destination)
})

// 2.5: paths outside systems depend on. Answer 200, never a redirect.
const FIXED_PATHS = [
  ...THANK_YOU_PAGES,
  '/venezuela-earthquake-relief',
  ...DETAIL_PAGES.filter((p) => p.startsWith('/events/') || p.startsWith('/children/')),
]
for (const path of FIXED_PATHS) {
  single('2.8-7', path, async ({ page }) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    expect(res.status(), `${path} answers ${res.status()} ${res.headers().location ?? ''}`).toBe(200)
  })
}
if (!HAS_CHILD_DATA) test('[2.8-7] /children/{slug}', () => test.skip(true, NO_CHILD_DATA))

single('2.8-9', '/robots.txt', async ({ page }) => {
  const res = await page.request.get('/robots.txt')
  expect(res.status()).toBe(200)
  const lines = (await res.text()).split('\n').map((l) => l.trim())
  expect(lines.filter((l) => /^sitemap:/i.test(l)), 'Sitemap lines').toHaveLength(1)
  const blocked = lines.filter((l) => /^disallow:\s*\S/i.test(l)).map((l) => l.replace(/^disallow:\s*/i, ''))
  for (const prefix of blocked) {
    const r = await page.request.get(prefix, { maxRedirects: 0 })
    expect(r.status(), `robots.txt blocks ${prefix}, which exists`).toBe(404)
  }
})

single('2.8-10', '/sitemap.xml', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/')
  const missing = [...INDEXABLE_PAGES, ...DETAIL_PAGES].flatMap((p) => LANGS.map((l) => inLang(p, l))).filter((p) => !locs.includes(p))
  expect(missing, 'pages missing from the sitemap').toEqual([])
  const thankYou = locs.filter((p) => /thank-you/.test(p))
  expect(thankYou, 'thank-you pages in the sitemap').toEqual([])
})
