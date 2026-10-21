import { expect, test } from '@playwright/test'

// Live content restored by the `restore-live-site-gaps` change, in both
// languages.

const FIXTURE_EVENT = '/events/fixture-closed-registration'

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

  test(`${lang}: the 2026 memories mosaic uses the page's own photos`, async ({ page }) => {
    await page.goto(`${prefix}/events/2026-golf-tournament`)
    const mosaic = page.locator('img[src*="vvf-golf2025-memories-"]')
    await expect(mosaic).toHaveCount(5)
    await expect(mosaic.first()).toHaveAttribute('alt', 'A golfer follows through on a tee shot at the 2025 Victoria Venezuela Foundation charity golf tournament.')
  })

  test(`${lang}: the physical therapy lounge keeps its paragraph`, async ({ page }) => {
    await page.goto(`${prefix}/events/2026-golf-tournament`)
    const text = lang === 'en' ? 'Help golfers warm up, improve mobility' : 'Ayuda a los golfistas a calentar'
    await expect(page.locator('[data-opp-panel]', { hasText: text })).toHaveCount(1)
  })

  test(`${lang}: closed registration hides every purchase link and shows the note`, async ({ page }) => {
    const res = await page.goto(`${prefix}${FIXTURE_EVENT}`)
    test.skip(res?.status() === 404, 'no fixture event (seed with SEED_FIXTURE_EVENTS=1)')
    const note = lang === 'en' ? 'Registration is closed.' : 'Las inscripciones están cerradas.'
    await expect(page.getByText(note)).toBeVisible()
    await expect(page.locator('main a[href*="donorbox.org/events"]')).toHaveCount(0)
  })

  test(`${lang}: open registration keeps the purchase links and shows no note`, async ({ page }) => {
    await page.goto(`${prefix}/events/2026-golf-tournament`)
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

// Detail pages aren't in the spec audit's page sweep (SPEC_PAGES), so the
// same no-sideways-scroll check runs here for them, in both languages.
const WIDTHS = [1440, 1280, 768, 440, 375]
const DETAIL_PAGES = ['/events/2025-golf-tournament', '/events/2026-golf-tournament', FIXTURE_EVENT, '/our-team/randy-lander']

for (const path of DETAIL_PAGES) {
  for (const prefix of ['', '/es']) {
    test(`no sideways scroll on ${prefix}${path}, 375 to 1440 px`, async ({ page }) => {
      const res = await page.goto(`${prefix}${path}`)
      test.skip(res?.status() === 404, 'page not in this seed')
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
