// Spec pages 7.1 to 7.6: Home, Sponsor a Child, Meet the Children, Child
// Profile, Ways to Give, Corporate Sponsorships.
import { expect, test, type Page } from '@playwright/test'
import { bilingual, open, english, HAS_CHILD_DATA, hrefsIn, inLang, jsonLdBlocks, LANGS, NO_CHILD_DATA, single, type Lang } from './helpers'


const today = new Date().toISOString()
const startOf = (d: Record<string, any>) => String(d.start ?? d.start_date ?? '')

// --- 7.1 Home ----------------------------------------------------------------

bilingual('7.1-1', '/', async ({ page, path }) => {
  await open(page, path)
  await expect(page.locator('h1')).toHaveCount(1)
  const deep = await page.$$eval('main h4, main h5, main h6', (hs) => hs.map((h) => `${h.tagName} ${(h.textContent ?? '').trim()}`))
  expect(deep, 'card titles are H3, section titles H2').toEqual([])
})

bilingual('7.1-2', '/', async ({ page, path, lang }) => {
  await open(page, path)
  const hrefs = await hrefsIn(page)
  for (const target of ['/sponsor-a-child', '/ways-to-give', '/children', '/events-and-campaigns', '/financials-and-transparency']) {
    expect(hrefs, `Home links to ${inLang(target, lang)}`).toContain(inLang(target, lang))
  }
})

bilingual('7.1-3', '/', async ({ page, path, lang }) => {
  await open(page, path)
  const events = english('events')
  const upcoming = events
    .filter((e) => e.data.featured && startOf(e.data) >= today && e.data.lifecycle !== 'cancelled')
    .sort((a, b) => startOf(a.data).localeCompare(startOf(b.data)))
  const latestPast = events.filter((e) => startOf(e.data) < today).sort((a, b) => startOf(b.data).localeCompare(startOf(a.data)))[0]
  const expected = (upcoming.length ? upcoming : latestPast ? [latestPast] : []).map((e) => inLang(`/events/${e.slug}`, lang))
  const shown = [...new Set((await hrefsIn(page)).filter((h) => /\/events\/[^/]+$/.test(h)))]
  expect(shown, 'Home event cards: upcoming featured, soonest first; else the latest past event').toEqual(expected)
})

bilingual('7.1-4', '/', async ({ page, path }) => {
  await open(page, path)
  const placeholder = await page.$$eval('main a[href="#"], main a[href=""]', (as) => as.length)
  expect(placeholder, 'logo links to "#"').toBe(0)
  const partners = english('partners')
  expect(partners.length, 'partner content type with `active`').toBeGreaterThan(0)
  const active = partners.filter((p) => p.data.active)
  const logos = await page.locator('main img[alt]').evaluateAll((imgs, names) => imgs.filter((i) => names.includes(i.getAttribute('alt') ?? '')).length, active.map((p) => String(p.data.name)))
  expect(logos, 'one logo per active partner').toBeGreaterThanOrEqual(active.length)
})

bilingual('7.1-5', '/', async ({ page, path, lang }) => {
  await open(page, path)
  const annual = english('articles', 'resources')
    .filter((a) => (a.data.report_type ?? a.data.report_kind) === 'annual')
    .sort((a, b) => String(b.data.publish_date ?? b.data.published_on).localeCompare(String(a.data.publish_date ?? a.data.published_on)))[0]
  expect(annual, 'an annual report exists').toBeTruthy()
  expect(await hrefsIn(page)).toContain(inLang(`/resources/${annual!.slug}`, lang))
})

// The online validator (validator.schema.org) isn't reachable from the test
// run; this checks the block parses and has every property the spec lists.
bilingual('7.1-6', '/', async ({ page, path }) => {
  await open(page, path)
  const ngo = (await jsonLdBlocks(page)).filter((b) => b['@type'] === 'NGO')
  expect(ngo, 'one NGO block').toHaveLength(1)
  const b = ngo[0]
  expect(b['@context']).toBe('https://schema.org')
  expect(b.name).toBe('Victoria Venezuela Foundation')
  expect(b.legalName, 'no legalName').toBeUndefined()
  for (const k of ['url', 'logo', 'description', 'nonprofitStatus', 'taxID', 'email', 'telephone']) expect(b[k], k).toBeTruthy()
  expect(b.nonprofitStatus).toBe('Nonprofit501c3')
  expect(b.address?.['@type']).toBe('PostalAddress')
  expect(b.address?.postOfficeBoxNumber, 'P.O. Box').toBeTruthy()
  for (const host of ['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'candid.org']) {
    expect((b.sameAs as string[]).some((u) => new URL(u).hostname.endsWith(host)), `sameAs ${host}`).toBe(true)
  }
  expect(JSON.stringify(b), 'no "Inc"').not.toMatch(/\bInc\b/)
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(b.description, 'description in the page language').toBe(description)
})

bilingual('7.1-7', '/', async ({ page, path }) => {
  // On a phone the hero shows the phone photo when one is set (offered
  // through <picture><source media>), and the main photo when not.
  await page.setViewportSize({ width: 375, height: 800 })
  await open(page, path)
  const hero = page.locator('main section').first()
  const img = hero.locator('picture img').first()
  await expect(img, 'hero photo').toBeVisible()
  const source = hero.locator('picture source[media]')
  const phone = (await source.count()) ? await source.first().getAttribute('srcset') : null
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.currentSrc)).toBeTruthy()
  const shown = new URL(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).pathname
  const expected = new URL(phone ?? (await img.getAttribute('src'))!, page.url()).pathname
  expect(shown, phone ? 'phone photo on phones' : 'main photo when no phone photo is set').toBe(expected)
})

// --- 7.2 Sponsor a Child --------------------------------------------------------

const availableChildren = () =>
  english('children').filter((c) => (c.data.sponsorship_status ? c.data.sponsorship_status === 'available' : c.data.published))

bilingual('7.2-1', '/sponsor-a-child', async ({ page, path, lang }) => {
  await open(page, path)
  const hrefs = await hrefsIn(page)
  expect(hrefs.filter((h) => h === inLang('/children', lang)).length, 'main buttons go to the child list').toBeGreaterThanOrEqual(3)
  const anchors = hrefs.filter((h) => h.startsWith('#') || h.includes(`${path}#`))
  expect(anchors.length, 'How it works / Learn more anchors').toBeGreaterThanOrEqual(2)
  for (const a of anchors) await expect(page.locator(a.slice(a.indexOf('#')))).toHaveCount(1)
})

for (const id of ['7.2-2', '7.2-3']) {
  bilingual(id, '/sponsor-a-child', async ({ page, path, lang }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    await open(page, path)
    const cards = [...new Set((await hrefsIn(page)).filter((h) => /\/children\/[^/]+$/.test(h)))]
    const expected = availableChildren().map((c) => inLang(`/children/${c.slug}`, lang))
    expect(cards.sort(), 'carousel lists every available child and no other').toEqual(expected.sort())
  })
}

bilingual('7.2-4', '/sponsor-a-child', async ({ page, path, lang }) => {
  await open(page, path)
  expect(await hrefsIn(page), 'Still have questions? sets the topic').toContain(`${inLang('/contact', lang)}?topic=Child%20sponsorship`)
})

// --- 7.3 Meet the Children -------------------------------------------------------

async function childCards(page: Page) {
  return [...new Set((await hrefsIn(page)).filter((h) => /\/children\/[^/]+$/.test(h)))]
}

bilingual('7.3-1', '/children', async ({ page, path }) => {
  test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
  await open(page, path)
  const available = availableChildren().length
  expect((await childCards(page)).length).toBe(Math.min(20, available))
})

bilingual('7.3-2', '/children', async ({ page, path }) => {
  test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
  await open(page, path)
  const all = (await childCards(page)).length
  const search = page.getByRole('searchbox').or(page.locator('input[type="search"], input[name="name"]')).first()
  await search.fill(String(availableChildren()[0].data.name ?? availableChildren()[0].data.display_name).slice(0, 4))
  await expect.poll(async () => (await childCards(page)).length).toBeLessThan(all)
  await search.fill('')
  const ages = page.getByRole('checkbox')
  expect(await ages.count(), 'age ranges as checkboxes').toBe(4)
  await ages.nth(0).check()
  await ages.nth(1).check()
  await expect.poll(async () => (await childCards(page)).length).toBeGreaterThan(0)
})

bilingual('7.3-3', '/children', async ({ page, path }) => {
  test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
  await open(page, path)
  const search = page.getByRole('searchbox').or(page.locator('input[type="search"], input[name="name"]')).first()
  await search.fill('a')
  await expect(page).toHaveURL(/\?.+/)
  const filtered = (await childCards(page)).length
  await page.goto(page.url())
  expect((await childCards(page)).length).toBe(filtered)
})

bilingual('7.3-4', '/children', async ({ page, path, lang }) => {
  test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
  await open(page, path)
  const cards = await childCards(page)
  expect(cards.length).toBeGreaterThan(0)
  for (const c of cards) expect(c.startsWith(inLang('/children/', lang))).toBe(true)
})

// --- 7.4 Child Profile -------------------------------------------------------------

const childWithoutBirthday = () => availableChildren().find((c) => !c.data.birth_date && !c.data.birthday)
const anyChild = () => availableChildren()[0]

for (const lang of LANGS as Lang[]) {
  single('7.4-1', `${lang} no Birthday row`, async ({ page }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    const child = childWithoutBirthday()
    test.skip(!child, 'every child has a birth date')
    await open(page, inLang(`/children/${child!.slug}`, lang))
    await expect(page.locator('main')).not.toContainText(lang === 'es' ? /cumpleaños/i : /birthday/i)
  })

  single('7.4-2', `${lang} Donorbox form`, async ({ page }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    for (const child of availableChildren()) {
      await open(page, inLang(`/children/${child.slug}`, lang))
      const embeds = await page.locator('iframe[src*="donorbox.org"], dbox-widget, [data-donorbox-embed]').count()
      expect(embeds, `form on ${child.slug}`).toBeGreaterThan(0)
    }
  })

  single('7.4-3', `${lang} phone order`, async ({ page }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    await page.setViewportSize({ width: 375, height: 800 })
    await open(page, inLang(`/children/${anyChild().slug}`, lang))
    const top = (sel: string) => page.locator(sel).first().evaluate((e) => e.getBoundingClientRect().top + scrollY)
    const form = await top('iframe[src*="donorbox.org"], dbox-widget, [data-donorbox-embed]')
    const h1 = await top('h1')
    const facts = await page.getByText(lang === 'es' ? /^edad/i : /^age/i).first().evaluate((e) => e.getBoundingClientRect().top + scrollY)
    expect(form, 'form after the name').toBeGreaterThan(h1)
    expect(form, 'form before the fact rows').toBeLessThan(facts)
  })

  single('7.4-4', `${lang} generic share image`, async ({ page }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    await open(page, inLang('/sponsor-a-child', lang))
    const site = await page.locator('meta[property="og:image"]').getAttribute('content')
    await open(page, inLang(`/children/${anyChild().slug}`, lang))
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(site)
  })
}

// --- 7.5 Ways to Give ---------------------------------------------------------------

const UTM = { utm_source: 'website', utm_medium: 'ways-to-give', utm_campaign: 'give-block' }

bilingual('7.5-1', '/ways-to-give', async ({ page, path }) => {
  await open(page, path)
  const links = (await hrefsIn(page)).filter((h) => h.includes('donorbox.org/general-donation-vvf')).map((h) => new URL(h))
  const amounts = new Set(links.map((u) => u.searchParams.get('amount')))
  for (const a of ['25', '50', '100', '250', null]) expect(amounts.has(a), `amount ${a ?? 'Other'}`).toBe(true)
  for (const u of links) for (const [k, v] of Object.entries(UTM)) expect(u.searchParams.get(k), `${k} on ${u}`).toBe(v)
})

bilingual('7.5-2', '/ways-to-give', async ({ page, path }) => {
  await open(page, path)
  const featuredUpcoming = english('events').filter((e) => e.data.featured && startOf(e.data) >= today && e.data.lifecycle !== 'cancelled')
  const eventLinks = (await hrefsIn(page)).filter((h) => /\/events\/[^/]+$/.test(h))
  if (featuredUpcoming.length === 0) expect(eventLinks, 'no golf block without an upcoming featured event').toEqual([])
  else expect(eventLinks.length).toBeGreaterThan(0)
})

bilingual('7.5-3', '/ways-to-give', async ({ page, path }) => {
  await open(page, path)
  const appeal = page.locator('css:light=main section').filter({ hasText: /terremoto|earthquake/i }).last()
  // A link to a Donorbox page, or a Donorbox popup (dbox-widget, spec 8.1).
  const targets = await appeal.evaluate((s) =>
    [...s.querySelectorAll('a[href], button, [data-donorbox-campaign], dbox-widget[campaign]')].map((e) =>
      e.tagName === 'DBOX-WIDGET' ? `https://donorbox.org/${e.getAttribute('campaign')}` : (e.getAttribute('href') ?? e.getAttribute('data-donorbox-campaign') ?? e.outerHTML.match(/donorbox\.org\/[a-z0-9-]+/)?.[0] ?? '')
    )
  )
  // Donorbox targets only (the appeal's "Learn more" links to the site's own page).
  const donorbox = targets.filter((t) => /donorbox\.org/.test(t))
  expect(donorbox.length, 'appeal has a Give button').toBeGreaterThan(0)
  for (const t of donorbox) expect(t).not.toContain('general-donation')
  expect(donorbox.some((t) => t.includes('donorbox.org/venezuela-earthquake-relief'))).toBe(true)
})

// --- 7.6 Corporate Sponsorships -------------------------------------------------------

bilingual('7.6-1', '/corporate-sponsorships', async ({ page, path }) => {
  await open(page, path)
  const hero = page.locator('main section').first()
  const anchor = await hero.locator('a[href^="#"]').first().getAttribute('href')
  expect(anchor, 'hero button is an anchor').toBeTruthy()
  await expect(page.locator(anchor!).getByRole('tab').first()).toBeAttached()
})

bilingual('7.6-2', '/corporate-sponsorships', async ({ page, path }) => {
  await open(page, path)
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(4)
  const panels: string[] = []
  for (let i = 0; i < 4; i++) {
    await tabs.nth(i).click()
    const panel = page.getByRole('tabpanel').locator('visible=true').first()
    panels.push(((await panel.textContent()) ?? '').trim())
  }
  for (const p of panels) expect(p.length, 'panel has benefits').toBeGreaterThan(20)
  expect(new Set(panels).size, 'each tier has its own benefits').toBe(4)
})
