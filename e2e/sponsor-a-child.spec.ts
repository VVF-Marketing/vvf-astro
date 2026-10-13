import { expect, test } from '@playwright/test'
import { firstChild } from './fixtures'

test('children list renders, name filter narrows results, and a card links to its detail page', async ({
  page,
}) => {
  const child = firstChild()
  test.skip(!child, 'No children in the seed (child data is local-only)')
  if (!child) return

  await page.goto('/sponsor-a-child/children')
  await expect(page.getByRole('heading', { level: 1, name: 'Meet the children' })).toBeVisible()

  const cards = page.locator('[data-child-card]')
  const visibleCards = page.locator('[data-child-card]:visible')
  const totalCount = await cards.count()
  expect(totalCount).toBeGreaterThan(0)

  const targetCard = page.locator(`[data-child-card][data-name="${child.displayName.toLowerCase()}"]`)

  await page.locator('[data-name-filter]').fill(child.displayName)
  await expect(targetCard).toBeVisible()
  const narrowedCount = await visibleCards.count()
  expect(narrowedCount).toBeLessThanOrEqual(totalCount)
  await expect(page.locator('[data-empty-state]')).toBeHidden()

  await page.locator('[data-name-filter]').fill('a-name-that-matches-nobody')
  await expect(page.locator('[data-empty-state]')).toBeVisible()
  await expect(visibleCards).toHaveCount(0)

  await page.locator('[data-name-filter]').fill('')
  await expect(visibleCards).toHaveCount(totalCount)

  await page.goto(`/sponsor-a-child/children/${child.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: child.displayName })).toBeVisible()
})

test('child detail breadcrumb links back to Sponsor a Child and marks the child as current', async ({ page }) => {
  const child = firstChild()
  test.skip(!child, 'No children in the seed (child data is local-only)')
  if (!child) return

  await page.goto(`/sponsor-a-child/children/${child.slug}`)
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
