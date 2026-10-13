import { expect, test } from '@playwright/test'

test.describe('site header', () => {
  test('dropdowns open from the keyboard and Escape returns focus to the toggle', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' }).first()
    const toggle = nav.getByRole('button', { name: 'Resources' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await toggle.focus()
    await page.keyboard.press('ArrowDown')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link', { name: 'All Resources' })).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(nav.getByRole('link', { name: 'Stories' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toBeFocused()
    await expect(nav.getByRole('link', { name: 'All Resources' })).toBeHidden()
  })

  test('Enter toggles a dropdown open', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('navigation', { name: 'Primary' }).first().getByRole('button', { name: 'Make a Difference' })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  test('shows the live navigation order and CTAs', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' }).first()
    await expect(nav.locator(':scope > ul > li > :first-child')).toHaveText(['Make a Difference', 'Get Involved', 'Our Team', 'Resources'])
    await expect(nav.getByRole('link', { name: 'Donate' })).toHaveAttribute('href', '/ways-to-give')
    await expect(nav.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact')
    await expect(page.getByRole('link', { name: 'ES', exact: true })).toHaveCount(0)
  })

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('menu button exposes aria-expanded and reveals the menu', async ({ page }) => {
      await page.goto('/')
      const button = page.getByRole('button', { name: 'Menu' })
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      const mobileNav = page.locator('#mobile-menu')
      await expect(mobileNav).toBeHidden()

      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await expect(mobileNav.getByRole('link', { name: 'Sponsor a Child' })).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      await expect(mobileNav).toBeHidden()
    })
  })
})
