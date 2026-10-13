import { expect, test, type Page } from '@playwright/test'

// Language switch (src/components/LanguageSwitch.astro): one component in the
// desktop header, the phone menu and the footer.

for (const [path, current, other, otherHref] of [
  ['/sponsor-a-child', 'English', 'Español', '/es/sponsor-a-child'],
  ['/es/sponsor-a-child', 'Español', 'English', '/sponsor-a-child'],
] as const) {
  test(`header and footer switches on ${path} mark ${current} and link to the same page`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(path)
    for (const where of ['header [data-language-switch="nav"]', 'footer [data-language-switch="footer"]']) {
      const sw = page.locator(where).first()
      await expect(sw, where).toBeVisible()
      await expect(sw).toHaveText(/EN\s*\/\s*ES/)
      await expect(sw.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page')
      await expect(sw.getByRole('link', { name: other })).toHaveAttribute('href', otherHref)
    }
  })
}

test('on phones the switch is the first line of the open menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/es/ways-to-give')
  await page.locator('[data-mobile-menu-toggle]').click()
  const menu = page.locator('[data-mobile-menu]')
  await expect(menu).toBeVisible()
  const first = menu.locator(':scope > *').first()
  await expect(first).toHaveAttribute('data-language-switch', 'nav')
  await expect(first.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/ways-to-give')
  await expect(first.getByRole('link', { name: 'Español' })).toHaveAttribute('aria-current', 'page')
})

async function boxes(page: Page) {
  const nav = page.locator('header nav[aria-label]').first()
  const menu = await nav.locator(':scope > ul').first().boundingBox()
  const sw = await page.locator('header [data-language-switch="nav"]').first().boundingBox()
  const buttons = await nav.locator('a[href$="/ways-to-give"]').last().boundingBox()
  return { menu: menu!, sw: sw!, buttons: buttons! }
}

const overlaps = (a: { x: number; width: number }, b: { x: number; width: number }) => a.x < b.x + b.width && b.x < a.x + a.width

for (const width of [992, 1280, 1440]) {
  for (const path of ['/', '/es']) {
    test(`header fits at ${width}px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const { menu, sw, buttons } = await boxes(page)
      expect(overlaps(menu, sw), 'menu vs switch').toBe(false)
      expect(overlaps(sw, buttons), 'switch vs Donate').toBe(false)
      const header = await page.evaluate(() => {
        const h = document.querySelector('header')!
        return { scroll: h.scrollWidth, right: Math.max(...[...h.querySelectorAll('nav *')].map((e) => e.getBoundingClientRect().right)) }
      })
      expect(header.scroll, 'header scroll width').toBeLessThanOrEqual(width)
      expect(header.right, 'rightmost header element').toBeLessThanOrEqual(width)
    })
  }
}
