import { expect, test } from '@playwright/test'

// Financials & Transparency (mirrors the live page) and Our Programs (from
// the design), in both locales.

test('Financials & Transparency shows its sections and report lists', async ({ page, request }) => {
  const res = await request.get('/financials-and-transparency', { maxRedirects: 0 })
  expect(res.status()).toBe(200)

  await page.goto('/financials-and-transparency')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Financials & Transparency')
  for (const heading of ['Independently reviewed for transparency', 'Where your donation goes', 'Annual reports', 'Quarterly impact reports', 'Our board oversees the foundation', 'Still have questions for us?']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Our IRS determination letter' })).toHaveAttribute('href', '/files/vvf-irs-determination-letter.pdf')

  const annual = page.locator('section', { has: page.getByRole('heading', { name: 'Annual reports' }) }).locator('li')
  await expect(annual.first().getByRole('heading', { level: 3 })).toHaveText('Impact Report 2025')
  await expect(annual.first().getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/resources/impact-report-2025')
  const quarterly = page.locator('section', { has: page.getByRole('heading', { name: 'Quarterly impact reports' }) }).locator('li')
  expect(await quarterly.count()).toBeGreaterThan(0)
  await expect(quarterly.first().getByRole('heading', { level: 3 })).toContainText('Your Impact')
})

test('Financials & Transparency in Spanish shows the live Spanish copy', async ({ page }) => {
  await page.goto('/es/financials-and-transparency')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finanzas y transparencia')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/es\/financials-and-transparency$/)
})

for (const width of [1440, 390]) {
  test(`Our Programs shows its sections at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/our-programs')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Our programs transform children's lives")
    const programs = page.locator('#programs h2')
    await expect(programs).toHaveText(['Nutrition program feeds hungry children', 'Medical care restores health and hope', 'Education opens doors for Venezuelan children'])
    for (const name of ['Support', 'View gallery']) expect(await page.locator('#programs').getByRole('link', { name, exact: true }).count()).toBe(3)
    await expect(page.getByRole('heading', { level: 2, name: 'Our work aligns with global development goals' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Support our programs' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Dig deeper into our work' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

test('Our Programs publishes no testimonials while the collection is empty', async ({ page }) => {
  await page.goto('/our-programs')
  await expect(page.locator('[data-testimonials]')).toHaveCount(0)
  await expect(page.getByText('Stories of transformation')).toHaveCount(0)
  await expect(page.getByText('Maria Santos')).toHaveCount(0)
})

test('Our Programs in Spanish falls back to English and canonicalizes to it', async ({ page }) => {
  await page.goto('/es/our-programs')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Our programs transform children's lives")
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/our-programs$/)
  await expect(page.locator('link[rel="canonical"]')).not.toHaveAttribute('href', /\/es\//)
})

test('About lists Our Team, Our Programs and Financials & Transparency in both locales', async ({ page }) => {
  for (const [path, links] of [
    ['/', [['/our-team', 'Our Team'], ['/our-programs', 'Our Programs'], ['/financials-and-transparency', 'Financials & Transparency']]],
    ['/es', [['/es/our-team', 'Nuestro equipo'], ['/es/our-programs', 'Nuestros programas'], ['/es/financials-and-transparency', 'Finanzas y transparencia']]],
  ] as const) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(path)
    const nav = page.getByRole('navigation', { name: /Primary|Principal/ }).first()
    for (const [href, label] of links) await expect(nav.locator(`a[href="${href}"]:not([hreflang])`)).toHaveText(label)
  }
})
