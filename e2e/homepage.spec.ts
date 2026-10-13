import { expect, test } from '@playwright/test'

test('homepage loads and the primary nav resolves to real pages', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header').getByRole('link', { name: 'Victoria Venezuela Foundation home' })).toBeVisible()

  // Every anchor in the primary nav, including links inside closed dropdowns.
  const desktopNav = page.getByRole('navigation', { name: 'Primary' }).first()
  const navLinks = await desktopNav.locator('a[href]').all()
  expect(navLinks.length).toBeGreaterThan(0)

  const hrefs = new Set<string>()
  for (const link of navLinks) {
    const href = await link.getAttribute('href')
    if (href) hrefs.add(href)
  }

  for (const href of hrefs) {
    const response = await page.request.get(href)
    expect(response.ok(), `nav link ${href} should resolve`).toBe(true)
  }
})

test('donate link in the header points at Ways to Give, as on the live site', async ({ page }) => {
  await page.goto('/')
  const donateLink = page.getByRole('link', { name: 'Donate' }).first()
  await expect(donateLink).toHaveAttribute('href', '/ways-to-give')
})
