import { expect, test } from '@playwright/test'
import { firstResource } from './fixtures'

test('resources list, category filter and detail page', async ({ page }) => {
  const resource = firstResource()

  await page.goto('/resources')
  await expect(page.getByRole('heading', { level: 1, name: 'Resources' })).toBeVisible()

  const filters = page.getByRole('navigation', { name: 'Resource categories' })
  await filters.getByRole('link', { name: 'Stories' }).click()
  await expect(page).toHaveURL(/\/resources\/category\/stories$/)
  await expect(filters.getByRole('link', { name: 'Stories' })).toHaveAttribute('aria-current', 'page')

  await page.goto(`/resources/${resource.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: resource.title })).toBeVisible()
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(crumbs.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources')
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(resource.title)
  await expect(page.getByText(/^Last updated /)).toBeVisible()
})

test('a resource with a report offers a locally hosted PDF download', async ({ page }) => {
  await page.goto('/resources/impact-report-2025')
  const download = page.getByRole('link', { name: 'Download the report (PDF)' })
  await expect(download).toHaveAttribute('href', /^\/_emdash\/api\/media\/file\//)
  const response = await page.request.get((await download.getAttribute('href'))!)
  expect(response.headers()['content-type']).toContain('pdf')
})

test('unknown resource and category return 404', async ({ page }) => {
  expect((await page.request.get('/resources/does-not-exist')).status()).toBe(404)
  expect((await page.request.get('/resources/category/does-not-exist')).status()).toBe(404)
})

// Rich-text tables match the live `.article_body` style
// (openspec/changes/add-rich-text-table-style).
for (const path of ['/resources/impact-report-2025', '/es/resources/impact-report-2025']) {
  test(`tables on ${path} use the live table style`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('.emdash-table')).toHaveCount(0)
    const card = page.locator('.content-table').first()
    await expect(card).toHaveCSS('border-top-left-radius', '16px')
    await expect(card).toHaveCSS('border-top-color', 'rgb(220, 228, 236)')
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(card.locator('thead th').first()).toHaveCSS('background-color', 'rgb(193, 231, 245)')
    await expect(card.locator('thead th').first()).toHaveCSS('font-weight', '600')
    const rows = card.locator('tbody tr')
    // No zebra striping: body rows have no background of their own.
    await expect(rows.nth(1)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(rows.nth(0).locator('td').first()).toHaveCSS('font-weight', '600')
    await expect(rows.nth(0).locator('td').nth(1)).toHaveCSS('font-weight', '400')
    await expect(rows.nth(0).locator('td').first()).toHaveCSS('font-size', '16px')
    await expect(rows.nth(0).locator('td').first()).toHaveCSS('border-top-color', 'rgb(220, 228, 236)')
  })
}

test('a paragraph right after a table is a small grey source note', async ({ page }) => {
  await page.goto('/resources/how-to-sponsor-a-child-directly')
  const note = page.locator('.content-table + p').first()
  await expect(note).toContainText('Large-charity costs')
  await expect(note).toHaveCSS('font-size', '14px')
  await expect(note).toHaveCSS('color', 'rgb(124, 135, 143)')
})

test('tables fit a phone: smaller text and no page-wide horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resources/impact-report-2025')
  const firstCell = page.locator('.content-table tbody td').first()
  await expect(firstCell).toHaveCSS('font-size', '14px')
  await expect(firstCell).toHaveCSS('padding-left', '8px')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
