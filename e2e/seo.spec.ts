import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { FIXTURE_OPEN_EVENT, gotoFixtureEvent } from './fixtures'

const pageSeo = JSON.parse(readFileSync(new URL('../src/data/page-seo.json', import.meta.url), 'utf-8'))
const SITE = 'https://www.victoriavenezuelafoundation.org'

test('static page uses the live title, description, canonical and share image', async ({ page }) => {
  const live = pageSeo['/corporate-sponsorships']
  await page.goto('/corporate-sponsorships')
  await expect(page).toHaveTitle(live.title)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', live.description)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/corporate-sponsorships`)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${SITE}${live.image}`)
})

test('every static page keeps the live title, description and share image', async ({ page }) => {
  for (const [path, live] of Object.entries(pageSeo) as [string, { title: string; description: string; image?: string }][]) {
    await page.goto(path)
    await expect(page, path).toHaveTitle(live.title)
    await expect(page.locator('meta[name="description"]'), path).toHaveAttribute('content', live.description)
    if (live.image) await expect(page.locator('meta[property="og:image"]'), path).toHaveAttribute('content', `${SITE}${live.image}`)
  }
})

test('resource page uses its CMS SEO fields', async ({ page }) => {
  await page.goto('/resources/impact-report-2025')
  await expect(page).toHaveTitle('Impact Report 2025 | Victoria Venezuela Foundation')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /2025 Impact Report/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/_emdash\/api\/media\/file\//)
})

// Structured data and social tags for search and answer engines
// (restore-live-site-gaps), in both languages.
const jsonLdTypes = async (page: import('@playwright/test').Page) =>
  (await page.$$eval('script[type="application/ld+json"]', (ss) => ss.map((s) => JSON.parse(s.textContent ?? '{}')['@type'] as string))).sort()

for (const prefix of ['', '/es']) {
  const lang = prefix ? 'es' : 'en'

  test(`${lang}: each page type emits its structured data`, async ({ page }) => {
    const expected: [string, string[]][] = [
      ['/', ['NGO', 'WebSite']],
      ['/sponsor-a-child', ['FAQPage']],
      ['/ways-to-give', ['FAQPage']],
      ['/resources/how-to-sponsor-a-child-directly', ['Article', 'BreadcrumbList']],
      ['/resources/stories', ['BreadcrumbList']],
      ['/our-team/randy-lander', ['Person']],
    ]
    for (const [path, types] of expected) {
      await page.goto(`${prefix}${path}`)
      expect(await jsonLdTypes(page), path).toEqual(types)
    }
  })

  // A made-up upcoming event: the FAQ only shows before an event's date.
  test(`${lang}: an upcoming event emits Event and FAQPage`, async ({ page }) => {
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
    expect(await jsonLdTypes(page)).toEqual(['Event', 'FAQPage'])
  })

  test(`${lang}: the FAQ structured data matches the questions on the page`, async ({ page }) => {
    await page.goto(`${prefix}/sponsor-a-child`)
    const faq = (await page.$$eval('script[type="application/ld+json"]', (ss) => ss.map((s) => JSON.parse(s.textContent ?? '{}')))).find((b) => b['@type'] === 'FAQPage')
    const shown = await page.locator('details summary h3').allTextContents()
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(shown.map((t) => t.trim()))
  })

  test(`${lang}: pages carry social tags and the theme colour`, async ({ page }) => {
    await page.goto(`${prefix}/resources/how-to-sponsor-a-child-directly`)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', ogTitle!)
    for (const tag of ['meta[property="og:image:alt"]', 'meta[name="twitter:description"]', 'meta[name="twitter:image"]', 'meta[name="theme-color"]']) {
      await expect(page.locator(tag), tag).toHaveAttribute('content', /.+/)
    }
    await page.goto(`${prefix}/`)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  })
}

test('Spanish detail pages use the Spanish brand in their titles', async ({ page }) => {
  await page.goto('/es/our-team/randy-lander')
  await expect(page).toHaveTitle('Randy Lander | Nuestro equipo | Fundación Victoria Venezuela')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Te presentamos a Randy Lander/)
  await page.goto('/es/events/2025-golf-tournament')
  await expect(page).toHaveTitle(/\| Fundación Victoria Venezuela$/)
  await page.goto('/es/financials-and-transparency')
  await expect(page).toHaveTitle('Finanzas y transparencia | Fundación Victoria Venezuela')
})

test('llms.txt lists the key pages, the upcoming events and a Spanish section', async ({ request }) => {
  const text = await (await request.get('/llms.txt')).text()
  expect(text).toContain(`[Sponsor a Child](${SITE}/sponsor-a-child)`)
  // Upcoming events with their page (in CI at least the made-up 2099 one).
  expect(text).toMatch(new RegExp(`## Upcoming events\\n\\n- \\[.+\\]\\(${SITE}/events/[^)]+\\)`))
  expect(text).toContain('## Common questions')
  expect(text).toContain(`(${SITE}/es/sponsor-a-child)`)
})
