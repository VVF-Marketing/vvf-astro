import { expect, test } from '@playwright/test'
import { firstChild } from './fixtures'

// Filters and the page number live in the URL (spec 7.3), so a filtered
// list can be shared; the page swaps its results as the visitor types.
test('children list renders, name filter narrows results via the URL, and a card links to its detail page', async ({
  page,
}) => {
  const child = firstChild()
  test.skip(!child, 'No children in the seed (child data is local-only)')
  if (!child) return

  await page.goto('/children')
  await expect(page.getByRole('heading', { level: 1, name: 'Meet the children' })).toBeVisible()

  const cards = page.locator('main a[href^="/children/"]')
  const totalCount = await cards.count()
  expect(totalCount).toBeGreaterThan(0)
  expect(totalCount).toBeLessThanOrEqual(20)

  const search = page.getByRole('searchbox')
  await search.fill(child.displayName)
  await expect(page).toHaveURL(/name=/)
  await expect(page.locator(`main a[href="/children/${child.slug}"]`)).toBeVisible()

  await search.fill('a-name-that-matches-nobody')
  await expect(page.getByText('No children match your filters.')).toBeVisible()
  await expect(cards).toHaveCount(0)

  // The shared URL shows the same filtered list.
  await page.goto(`/children?name=${encodeURIComponent(child.displayName)}`)
  await expect(page.locator(`main a[href="/children/${child.slug}"]`)).toBeVisible()

  await page.getByRole('searchbox').fill('a-name-that-matches-nobody')
  await page.getByRole('link', { name: 'Clear filters' }).click()
  await expect(cards).toHaveCount(totalCount)

  // The Donorbox form's own third-party scripts can keep `load` from firing.
  await page.goto(`/children/${child.slug}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: child.displayName })).toBeVisible()
})

test('child detail breadcrumb links back to Sponsor a Child and marks the child as current', async ({ page }) => {
  const child = firstChild()
  test.skip(!child, 'No children in the seed (child data is local-only)')
  if (!child) return

  // The Donorbox form's own third-party scripts can keep `load` from firing.
  await page.goto(`/children/${child.slug}`, { waitUntil: 'domcontentloaded' })
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(crumbs.getByRole('link', { name: 'Sponsor a Child' })).toHaveAttribute('href', '/sponsor-a-child')
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(child.displayName)
})

test('Sponsor a Child page follows the live section order', async ({ page }) => {
  await page.goto('/sponsor-a-child')
  await expect(page.locator('h1, h2')).toHaveText([
    'Sponsor a child in Venezuela',
    'Every child deserves a fighting chance',
    'Meet the children',
    'Three steps to change',
    'What sponsorship provides',
    'What you receive as a sponsor',
    'Frequently asked questions',
    'What if I need to cancel?',
    'We earn your trust through transparency',
  ])
})
