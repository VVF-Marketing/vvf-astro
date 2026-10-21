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
