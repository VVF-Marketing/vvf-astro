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
