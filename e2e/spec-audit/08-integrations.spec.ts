// Spec section 8: integrations, Spanish site and content rules (checks 8.9-3..6, 8..10).
// 8.9-1, 8.9-2 and 8.9-7 need a deployed site and are blocked (registry).
import { expect, test } from '@playwright/test'
import { bilingual, english, HAS_CHILD_DATA, inLang, LANGS, NO_CHILD_DATA, open, single, SPEC_PAGES, THANK_YOU_PAGES, type Lang } from './helpers'

const PAGES = SPEC_PAGES.filter((p) => !(THANK_YOU_PAGES as readonly string[]).includes(p))
const GTM = 'GTM-W33SN672'

// 8.9-3: the GTM container, once, and no other tag loader in page code.
for (const p of SPEC_PAGES) {
  bilingual('8.9-3', p, async ({ page, path }) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    expect(res.status(), `${path} must exist`).toBe(200)
    const html = await res.text()
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head.match(new RegExp(`googletagmanager\\.com/gtm\\.js\\?id=`, 'g'))?.length ?? 0, 'GTM loader in <head>').toBe(1)
    expect(head).toContain(GTM)
    const others = ['googletagmanager.com/gtag/js', 'google-analytics.com/analytics.js', 'connect.facebook.net', 'snap.licdn.com', 'js.hs-scripts.com'].filter((s) => html.includes(s))
    expect(others, 'other tag loaders in page code').toEqual([])
  })
}

// 8.9-4: every Ways to Give link to Donorbox keeps the tracking tags.
bilingual('8.9-4', '/ways-to-give', async ({ page, path }) => {
  // Donorbox's script adds links of its own (e.g. donorbox.org/explore with
  // its own UTM tags), sometimes outside <dbox-widget>; only the page's count.
  await page.route(/^https:\/\/(www\.)?donorbox\.org\//, (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()))
  await open(page, path)
  // The page's links to Donorbox (not the Donorbox widget's own markup, e.g. its share links).
  const links = (
    await page.$$eval('main a[href^="https://donorbox.org/"], main a[href^="https://www.donorbox.org/"]', (as) =>
      as.filter((a) => !a.closest('dbox-widget')).map((a) => (a as HTMLAnchorElement).href)
    )
  ).map((h) => new URL(h))
  expect(links.length).toBeGreaterThan(0)
  for (const u of links) {
    expect([u.searchParams.get('utm_source'), u.searchParams.get('utm_medium'), u.searchParams.get('utm_campaign')], u.href).toEqual([
      'website',
      'ways-to-give',
      'give-block',
    ])
  }
})

// 8.9-5: Donorbox page links open in a new tab; the widget script only where a popup or form is shown.
for (const p of PAGES) {
  bilingual('8.9-5', p, async ({ page, path }) => {
    await open(page, path)
    // The site's links to Donorbox pages (not the Donorbox widget's own markup, e.g. its share links).
    const sameTab = await page.$$eval('a[href^="https://donorbox.org/"], a[href^="https://www.donorbox.org/"]', (as) =>
      as.filter((a) => !a.closest('dbox-widget') && a.getAttribute('target') !== '_blank').map((a) => a.getAttribute('href'))
    )
    expect(sameTab, 'Donorbox links in the same tab').toEqual([])
    const script = await page.locator('script[src*="donorbox.org/widgets.js"]').count()
    const widgets = await page.locator('dbox-widget, iframe[src*="donorbox.org"], [data-donorbox-popup], .dbox-donation-button').count()
    if (script > 0) expect(widgets, 'widgets.js loaded with no popup or form').toBeGreaterThan(0)
    expect(script, 'widgets.js loads once at most').toBeLessThanOrEqual(1)
  })
}

// 8.9-6: the three third-party widgets render and respond at desktop and phone widths.
for (const lang of LANGS as Lang[]) {
  for (const width of [1440, 375]) {
    single('8.9-6', `${lang} ${width}px child sponsorship form`, async ({ page }) => {
      test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
      await page.setViewportSize({ width, height: 900 })
      const child = english('children').find((c) => c.data.sponsorship_status === 'available' || c.data.published)!
      await open(page, inLang(`/children/${child.slug}`, lang))
      await expect(page.locator('iframe[src*="donorbox.org"]').first()).toBeVisible({ timeout: 15_000 })
    })
    single('8.9-6', `${lang} ${width}px earthquake popup`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await open(page, inLang('/ways-to-give', lang))
      // The page's own sections (`css:light` stays out of the Donorbox widget's shadow DOM).
      const appeal = page.locator('css:light=main section').filter({ hasText: /terremoto|earthquake/i }).last()
      // The popup's trigger, by its label (the widget's form holds other, hidden Donate buttons).
      const give = appeal.getByRole('button', { name: lang === 'es' ? /donar a la campaña/i : /give to the appeal/i }).first()
      await expect(give, 'Give to the appeal button').toBeVisible({ timeout: 15_000 })
      // Donorbox's popup (dbox-widget) opens its donation form in the page, hidden until the button is pressed.
      const form = page.locator('dbox-widget[type="donation_form"][campaign="venezuela-earthquake-relief"]').first()
      await expect(form).toBeHidden()
      await give.click()
      await expect(form).toBeVisible({ timeout: 15_000 })
    })
    single('8.9-6', `${lang} ${width}px employer search`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await open(page, inLang('/corporate-sponsorships', lang))
      await expect(page.locator('#dd-container input').first()).toBeVisible({ timeout: 15_000 })
    })
  }
}

// 8.9-8: Spanish voice: apadrinar for children (patrocinar only for companies and events), usted only on Corporate.
const PATROCINAR_OK = ['/corporate-sponsorships', '/events-and-campaigns']
for (const p of PAGES) {
  single('8.9-8', inLang(p, 'es'), async ({ page }) => {
    await open(page, inLang(p, 'es'))
    const text = ((await page.locator('main').textContent()) ?? '').replace(/\s+/g, ' ')
    if (!PATROCINAR_OK.includes(p)) {
      // Patrocinar stays for companies and events; flag it only next to a child.
      const hits = [...text.matchAll(/.{0,30}(\bpatrocin\w*\s+(?:a\s+)?(?:un|una|al|los|las|tu|su)?\s*niñ\w*|niñ\w*\s+patrocinad\w*|\bpatrocinador(?:a|es)?\s+de\s+(?:un|una|los)?\s*niñ\w*).{0,30}/gi)].map((m) => m[0])
      expect(hits, 'patrocinar used for child sponsorship').toEqual([])
    }
    // Corporate speaks to companies as usted; the privacy policy is legal text, copied word for word (8.7).
    if (p !== '/corporate-sponsorships' && p !== '/privacy-policy') {
      const usted = [...text.matchAll(/.{0,30}\b(usted|ustedes)\b.{0,30}/gi)].map((m) => m[0])
      expect(usted, 'usted outside Corporate Sponsorships').toEqual([])
    }
  })
}

// 8.9-9: "Inc." only on financial reports and their articles.
for (const p of PAGES) {
  bilingual('8.9-9', p, async ({ page, path }) => {
    await open(page, path)
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    // The foundation's name never carries "Inc." (the Paula Inc. credit is required by 6.3).
    expect([...text.matchAll(/.{0,30}Foundation,?\s+Inc\b\.?.{0,10}/g)].map((m) => m[0]), '"Inc." after the name').toEqual([])
  })
}

// 8.9-10: children by first name and last initial only.
const NAME = /^[\p{Lu}][\p{L}'-]+(?: [\p{Lu}][\p{L}'-]+)* [\p{Lu}]\.$/u
for (const p of ['/children', '/sponsor-a-child']) {
  bilingual('8.9-10', p, async ({ page, path }) => {
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    await open(page, path)
    // A card's photo alt text is the child's name (8.7, rule 4); cards list the age first.
    const names = await page.$$eval('main a[href*="/children/"]', (as) =>
      as.map((a) => (a.getAttribute('aria-label') ?? a.querySelector('img')?.getAttribute('alt') ?? '').trim()).filter(Boolean)
    )
    expect(names.length).toBeGreaterThan(0)
    expect(names.filter((n) => !NAME.test(n))).toEqual([])
  })
}
