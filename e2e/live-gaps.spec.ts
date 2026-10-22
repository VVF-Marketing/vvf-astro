import { expect, test } from '@playwright/test'
import { eventCardPhotoFile, FIXTURE_CLOSED_EVENT, FIXTURE_OPEN_EVENT, gotoFixtureEvent } from './fixtures'

// Live content restored by the `restore-live-site-gaps` change, in both
// languages. Upcoming-event checks use the made-up fixture events (copies of
// the 2026 tournament dated 2099), so they keep passing once the real
// tournament's date passes and its page turns into a recap.

for (const [lang, prefix] of [
  ['en', ''],
  ['es', '/es'],
] as const) {
  for (const path of ['/', '/our-programs']) {
    test(`${lang}: the videos on ${path} each have their description`, async ({ page }) => {
      await page.goto(`${prefix}${path}`)
      const text = lang === 'en' ? 'Our community kitchens cook healthy meals for children in Venezuela.' : 'Nuestros comedores comunitarios preparan comidas saludables para niños en Venezuela.'
      await expect(page.getByText(text)).toBeVisible()
      await expect(page.locator('li:has(iframe[src*="youtube"]) p')).toHaveCount(3)
    })
  }

  test(`${lang}: Financials links the signed Form W-9, opening it in a new tab`, async ({ page, request }) => {
    await page.goto(`${prefix}/financials-and-transparency`)
    const w9 = page.getByRole('link', { name: lang === 'en' ? /^Our Form W-9/ : /^Nuestro formulario W-9/ })
    await expect(w9).toHaveAttribute('href', '/files/vvf-form-w9.pdf')
    await expect(w9).toHaveAttribute('target', '_blank')
    const pdf = await request.get('/files/vvf-form-w9.pdf')
    expect(pdf.ok()).toBe(true)
    expect(pdf.headers()['content-type']).toContain('application/pdf')
  })

  test(`${lang}: recap stats show their captions, the raised tile too`, async ({ page }) => {
    await page.goto(`${prefix}/events/2025-golf-tournament`)
    const golfers = lang === 'en' ? 'Took part for children in Venezuela' : 'Participaron por los niños de Venezuela'
    const raised = lang === 'en' ? 'For nutrition, medical care and education' : 'Para nutrición, atención médica y educación'
    await expect(page.getByText(golfers, { exact: true })).toBeVisible()
    await expect(page.getByText(raised, { exact: true })).toBeVisible()
  })

  test(`${lang}: a past event links to the other years`, async ({ page }) => {
    await page.goto(`${prefix}/events/2025-golf-tournament`)
    const section = page.locator('#previous-editions')
    await expect(section.getByRole('heading', { name: lang === 'en' ? 'Previous editions' : 'Ediciones anteriores' })).toBeVisible()
    await expect(section.getByRole('link', { name: lang === 'en' ? 'All events' : 'Todos los eventos' })).toHaveAttribute('href', `${prefix}/events-and-campaigns`)
  })

  test(`${lang}: the upcoming tournament's memories mosaic uses the page's own photos`, async ({ page }) => {
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
    const mosaic = page.locator('img[src*="vvf-golf2025-memories-"]')
    await expect(mosaic).toHaveCount(5)
    await expect(mosaic.first()).toHaveAttribute('alt', 'A golfer follows through on a tee shot at the 2025 Victoria Venezuela Foundation charity golf tournament.')
  })

  test(`${lang}: the physical therapy lounge keeps its paragraph`, async ({ page }) => {
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
    const text = lang === 'en' ? 'Help golfers warm up, improve mobility' : 'Ayuda a los golfistas a calentar'
    await expect(page.locator('[data-opp-panel]', { hasText: text })).toHaveCount(1)
  })

  test(`${lang}: closed registration hides every purchase link and shows the note`, async ({ page }) => {
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_CLOSED_EVENT}`)
    const note = lang === 'en' ? 'Registration is closed.' : 'Las inscripciones están cerradas.'
    await expect(page.getByText(note)).toBeVisible()
    await expect(page.locator('main a[href*="donorbox.org/events"]')).toHaveCount(0)
    // Nor a hero button down to the (button-less) sponsor packages.
    await expect(page.locator('main a[href="#sponsor-packages"]')).toHaveCount(0)
  })

  test(`${lang}: an upcoming event's card uses its card photo at every width`, async ({ page }) => {
    // The fixture copies the 2026 tournament, card photo included.
    const file = eventCardPhotoFile('2026-golf-tournament')
    expect(file).toBeTruthy()
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
    await page.goto(`${prefix}/events-and-campaigns`)
    const card = page.locator(`a[href$="${FIXTURE_OPEN_EVENT}"]`, { has: page.locator('img') }).first()
    await expect(card.locator('img')).toHaveAttribute('src', new RegExp(`${file}$`))
    await expect(card.locator('source')).toHaveCount(0)
  })

  test(`${lang}: open registration keeps the purchase links and shows no note`, async ({ page }) => {
    await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
    await expect(page.locator('main a[href*="donorbox.org/events"]').first()).toBeAttached()
    await expect(page.locator('#registration')).toHaveCount(0)
  })
}

test.describe('Our Team hero on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('shows the phone photo with its own description and skips the desktop photo', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (r) => requested.push(r.url()))
    await page.goto('/our-team')
    const phone = page.locator('img[src*="ourpeople-hero-mobile"]')
    await expect(phone).toBeVisible()
    await expect(phone).toHaveAttribute('alt', /doctor listens to a boy's chest/)
    await expect(page.locator('img[src*="ourpeople-hero-desktop"]')).toBeHidden()
    expect(requested.some((u) => u.includes('ourpeople-hero-desktop'))).toBe(false)
  })
})

// Sponsors added on Webflow on 2026-10-08 and 2026-10-21, with the Marlins
// first wherever partner logos show.
const NEW_SPONSORS = ['Miami Marlins', 'interCaribbean Airways', 'Galaxis', 'Yoloeight', 'MVP Cuts Barbershop', 'Maglé', 'Beyond the Catch', 'Luminis Global Partners']

for (const path of ['/', '/corporate-sponsorships', '/events/2026-golf-tournament']) {
  test(`sponsor logos on ${path} start with the Marlins and include the new sponsors`, async ({ page }) => {
    await page.goto(path)
    const names = await page.locator('[data-logo-carousel] [data-track] img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')))
    expect(names[0]).toBe('Miami Marlins')
    for (const name of NEW_SPONSORS) expect(names, name).toContain(name)
  })
}

test.describe('Home hero on an iPad', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('the photo sits on top and the card below it, not over it', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('[data-hero-layout="stacked"]')
    const photo = await hero.locator('img').first().boundingBox()
    const card = await hero.locator('[data-hero-card]').boundingBox()
    expect(photo && card).toBeTruthy()
    expect(card!.y).toBeGreaterThanOrEqual(photo!.y + photo!.height - 1)
  })
})

test.describe('Special Event Opportunities on a tablet', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('is an accordion with nothing open until tapped, and sold ones never offer tickets', async ({ page }) => {
    await gotoFixtureEvent(page, FIXTURE_OPEN_EVENT)
    const section = page.locator('[data-opps-tabs]')
    await expect(section.getByRole('tablist')).toBeHidden()
    await expect(section.getByRole('tabpanel')).toHaveCount(0)
    const items = section.locator('details')
    expect(await items.count()).toBeGreaterThan(0)
    expect(await items.evaluateAll((ds) => ds.filter((d) => (d as HTMLDetailsElement).open).length)).toBe(0)
    await items.first().locator('summary').click()
    await expect(items.first()).toHaveAttribute('open', '')
    await expect(section.locator('[aria-disabled="true"] a')).toHaveCount(0)
  })
})

test.describe('Sponsor logos on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  // Lazy photos off screen have no size until they load; SVG logos must have
  // one regardless, since some are saved without width and height.
  test('every SVG logo in the slider has a size', async ({ page }) => {
    await page.goto('/')
    const svgs = page.locator('[data-logo-carousel] [data-track] img[src$=".svg"]')
    await svgs.first().scrollIntoViewIfNeeded()
    expect(await svgs.count()).toBeGreaterThan(0)
    const widths = await svgs.evaluateAll((imgs) => imgs.map((i) => [i.getAttribute('alt'), i.getBoundingClientRect().width] as const))
    expect(widths.filter(([, w]) => w === 0)).toEqual([])
  })
})

test.describe('Sponsor benefits on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const [lang, prefix, count] of [
    ['en', '', /^\d+ of \d+ benefits$/],
    ['es', '/es', /^\d+ de \d+ beneficios$/],
  ] as const) {
    test(`${lang}: each package says how many benefits it includes, in the page's language`, async ({ page }) => {
      await gotoFixtureEvent(page, `${prefix}${FIXTURE_OPEN_EVENT}`)
      await expect(page.locator('details summary').getByText(count).first()).toBeVisible()
    })
  }
})

// Detail pages aren't in the spec audit's page sweep (SPEC_PAGES), so the
// same no-sideways-scroll check runs here for them, in both languages.
const WIDTHS = [1440, 1280, 768, 440, 375]
const DETAIL_PAGES = ['/events/2025-golf-tournament', '/events/2026-golf-tournament', FIXTURE_OPEN_EVENT, FIXTURE_CLOSED_EVENT, '/our-team/randy-lander']

for (const path of DETAIL_PAGES) {
  for (const prefix of ['', '/es']) {
    test(`no sideways scroll on ${prefix}${path}, 375 to 1440 px`, async ({ page }) => {
      if (path.includes('/fixture-')) await gotoFixtureEvent(page, `${prefix}${path}`)
      else expect((await page.goto(`${prefix}${path}`))?.status()).toBe(200)
      const problems: string[] = []
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${prefix}${path}`)
        // Whether the visitor can actually scroll sideways (as spec check 5.9-1).
        const overflow = await page.evaluate(() => {
          window.scrollTo(100000, window.scrollY)
          const x = window.scrollX
          window.scrollTo(0, window.scrollY)
          return x
        })
        if (overflow > 0) problems.push(`${width}px: scrolls sideways by ${overflow}px`)
      }
      expect(problems).toEqual([])
    })
  }
}
