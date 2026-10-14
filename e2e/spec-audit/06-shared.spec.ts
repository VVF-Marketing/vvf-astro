// Spec section 6: shared page parts (checks 6.4-x).
import { expect, type Page } from '@playwright/test'
import { bilingual, inLang, LANGS, single, SPEC_PAGES, THANK_YOU_PAGES } from './helpers'

const PAGES = SPEC_PAGES.filter((p) => !(THANK_YOU_PAGES as readonly string[]).includes(p))

async function chromeLinks(page: Page) {
  const read = (sel: string) =>
    page.$$eval(`${sel} a[href]`, (as) =>
      as
        .filter((a) => !/^(EN|ES)$/.test((a.textContent ?? '').trim()))
        .map((a) => `${(a.textContent ?? '').trim()} → ${new URL((a as HTMLAnchorElement).href, location.href).pathname}`)
    )
  return { header: await read('header'), footer: await read('footer') }
}

// 6.4-1: same navbar and footer on every page of a language (pages that exist).
for (const lang of LANGS) {
  single('6.4-1', `${lang} every page`, async ({ page }) => {
    await page.goto(inLang('/', lang), { waitUntil: 'domcontentloaded' })
    const reference = await chromeLinks(page)
    for (const p of PAGES.slice(1)) {
      const res = await page.goto(inLang(p, lang), { waitUntil: 'domcontentloaded' })
      if (res?.status() !== 200) continue
      expect(await chromeLinks(page), inLang(p, lang)).toEqual(reference)
    }
  })
}

// 6.4-2: the language switch opens this page's counterpart.
for (const p of PAGES) {
  bilingual('6.4-2', p, async ({ page, path, lang }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `${path} must exist`).toBe(200)
    const other = lang === 'en' ? 'es' : 'en'
    const targets = await page.$$eval('a[href]', (as, label) =>
      as.filter((a) => (a.textContent ?? '').trim() === label).map((a) => new URL((a as HTMLAnchorElement).href, location.href).pathname.replace(/\/$/, '') || '/'),
      other.toUpperCase()
    )
    expect(targets.length, 'language switch present').toBeGreaterThan(0)
    for (const t of targets) expect(t).toBe(inLang(p, other))
  })
}

// 6.4-3: on a phone, tapping a menu label opens its list and stays on the page.
for (const lang of LANGS) {
  single('6.4-3', `${lang} phone menu label`, async ({ page: desktop }) => {
    const context = await desktop.context().browser()!.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    const start = inLang('/', lang)
    await page.goto(start, { waitUntil: 'domcontentloaded' })
    await page.locator('header [aria-expanded]:visible').first().tap()
    const label = lang === 'es' ? /marca la diferencia/i : /make a difference/i
    const menuLabel = page.locator('header').getByText(label).locator('visible=true').first()
    await expect(menuLabel, 'phone menu shows the Make a Difference label').toBeVisible()
    await menuLabel.tap()
    await expect(page).toHaveURL(new RegExp(`${start}$`))
    const item = page.locator('header').getByRole('link', { name: lang === 'es' ? /apadrina a un niño/i : /sponsor a child/i }).locator('visible=true')
    await expect(item.first(), 'menu list opens').toBeVisible()
    await context.close()
  })
}

// 6.4-4: copyright year.
for (const lang of LANGS) {
  single('6.4-4', `${lang} copyright year`, async ({ page }) => {
    await page.goto(inLang('/', lang), { waitUntil: 'domcontentloaded' })
    await expect(page.locator('footer')).toContainText(`© ${new Date().getFullYear()}`)
  })
}
