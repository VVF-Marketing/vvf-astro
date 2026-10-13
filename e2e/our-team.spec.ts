import { expect, test } from '@playwright/test'
import { firstBoardMember, firstStaffMember } from './fixtures'

test('team page renders tiers and a board member has a working profile page', async ({ page }) => {
  const board = firstBoardMember()

  await page.goto('/our-team')
  await expect(page.getByRole('heading', { level: 1, name: 'Our People' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Board of Directors' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Our Team' })).toBeVisible()
  await expect(page.getByText(board.name).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Board seat open/ })).toHaveAttribute('href', '/contact')

  await page.goto(`/our-team/${board.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: board.name })).toBeVisible()
})

// Profiles live at the person's profile slug; per-tier entry slugs
// (e.g. `<name>-staff`) are not routes.
test('a per-tier entry slug has no route of its own', async ({ page }) => {
  const staff = firstStaffMember()
  test.skip(staff.slug === staff.profileSlug, 'first staff entry is the profile entry')
  const response = await page.request.get(`/our-team/${staff.slug}`)
  expect(response.status()).toBe(404)
})
