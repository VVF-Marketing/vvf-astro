// Spec section 3: sitemap and navigation (checks 3.4-x).
import { expect, type Page } from '@playwright/test'
import { bilingual, inLang, LANGS, seedItems, single, SPEC_PAGES, THANK_YOU_PAGES, type Lang } from './helpers'

const PAGES = SPEC_PAGES.filter((p) => !(THANK_YOU_PAGES as readonly string[]).includes(p))

async function links(page: Page, selector: string) {
  return page.$$eval(`${selector} a[href]`, (as) =>
    as.map((a) => ({ href: new URL((a as HTMLAnchorElement).href, location.href).pathname, text: (a.textContent ?? '').trim() }))
  )
}

// Pages reached from the menu or footer (3.1), and pages reached from another page.
const FROM_CHROME = [
  '/sponsor-a-child',
  '/ways-to-give',
  '/corporate-sponsorships',
  '/events-and-campaigns',
  '/our-programs',
  '/our-team',
  '/financials-and-transparency',
  '/resources',
  '/resources/stories',
  '/resources/financials',
  '/contact',
  '/privacy-policy',
]
const FROM_PAGE: [string, string][] = [
  ['/sponsor-a-child', '/children'],
  ['/events-and-campaigns', '/venezuela-earthquake-relief'],
]

for (const lang of LANGS) {
  single('3.4-1', `${lang} menu and footer`, async ({ page }) => {
    await page.goto(inLang('/', lang), { waitUntil: 'domcontentloaded' })
    const found = new Set([...(await links(page, 'header')), ...(await links(page, 'footer'))].map((l) => l.href))
    const missing = FROM_CHROME.map((p) => inLang(p, lang)).filter((p) => !found.has(p))
    expect(missing, `${lang}: pages not reachable from menu or footer`).toEqual([])
  })
  for (const [from, to] of FROM_PAGE) {
    single('3.4-1', `${lang} ${to} from ${from}`, async ({ page }) => {
      const res = await page.goto(inLang(from, lang), { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `${inLang(from, lang)} must exist`).toBe(200)
      const hrefs = (await links(page, 'main')).map((l) => l.href)
      expect(hrefs, `${inLang(from, lang)} links to ${inLang(to, lang)}`).toContain(inLang(to, lang))
    })
  }
}

// Missing pages are 2.8-1's failure; this check compares the pages that exist.
async function chrome(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
  if (res?.status() !== 200) return undefined
  return { header: await links(page, 'header'), footer: await links(page, 'footer') }
}

for (const lang of LANGS) {
  single('3.4-2', `${lang} menu and footer on every page`, async ({ page }) => {
    const reference = (await chrome(page, inLang('/', lang)))!
    for (const p of PAGES.slice(1)) {
      const path = inLang(p, lang)
      const current = await chrome(page, path)
      if (!current) continue
      // The language switch follows the current page (6.4-2), so compare everything else.
      const strip = (ls: { href: string; text: string }[]) => ls.filter((l) => !/^(EN|ES)$/.test(l.text))
      expect(strip(current.header), `header on ${path}`).toEqual(strip(reference.header))
      expect(strip(current.footer), `footer on ${path}`).toEqual(strip(reference.footer))
    }
  })
}

for (const p of PAGES) {
  bilingual('3.4-3', p, async ({ page, path }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} must exist`).toBe(200)
    const hrefs = (await links(page, 'body')).map((l) => l.href)
    expect(hrefs.filter((h) => /\/thank-you-/.test(h)), `thank-you links on ${path}`).toEqual([])
  })
}

// 3.4-4: the News page, menu item and filter button follow published News articles.
const hasNews = seedItems('resources').some((e) => !e.locale && /news/i.test(JSON.stringify(e.data.categories ?? e.data.category ?? '')))
for (const lang of LANGS as Lang[]) {
  single('3.4-4', `${lang} News ${hasNews ? 'shown' : 'hidden'}`, async ({ page }) => {
    const label = lang === 'es' ? 'Noticias' : 'News'
    const res = await page.request.get(inLang('/resources/news', lang), { maxRedirects: 0 })
    expect(res.status(), `/resources/news with${hasNews ? '' : 'out'} News articles`).toBe(hasNews ? 200 : 404)
    for (const p of ['/', '/resources']) {
      await page.goto(inLang(p, lang), { waitUntil: 'domcontentloaded' })
      const newsLinks = (await links(page, 'body')).filter((l) => l.text === label || /\/resources\/news$/.test(l.href))
      if (hasNews) expect(newsLinks.length, `News links on ${inLang(p, lang)}`).toBeGreaterThan(0)
      else expect(newsLinks, `News links on ${inLang(p, lang)}`).toEqual([])
    }
  })
}
