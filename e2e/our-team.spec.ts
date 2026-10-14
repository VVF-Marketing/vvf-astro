import { expect, test } from '@playwright/test'
import { firstBoardMember, firstStaffMember } from './fixtures'

test('team page renders tiers and a board member has a working profile page', async ({ page }) => {
  const board = firstBoardMember()

  await page.goto('/our-team')
  await expect(page.getByRole('heading', { level: 1, name: 'Our People' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Board of Directors' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Our Team' })).toBeVisible()
  await expect(page.getByText(board.name).first()).toBeVisible()
  // One open-seat tile under the Board, to Contact with the topic Other (spec 7.9).
  await expect(page.getByRole('link', { name: /Board seats open/ })).toHaveAttribute('href', '/contact?topic=Other')

  await page.goto(`/our-team/${board.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: board.name })).toBeVisible()
})

// One record per person (spec 4.4, content check 3): the earlier per-tier
// slugs (`<name>-staff`) are not routes.
test('a per-tier entry slug has no route of its own', async ({ page }) => {
  const staff = firstStaffMember()
  const response = await page.request.get(`/our-team/${staff.slug}-staff`)
  expect(response.status()).toBe(404)
})
