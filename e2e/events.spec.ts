import { expect, test } from '@playwright/test'
import { firstEvent } from './fixtures'

test('events list renders events and links to a detail page that renders', async ({ page }) => {
  const event = firstEvent()

  await page.goto('/events')
  await expect(page.getByRole('heading', { level: 1, name: 'Events & Campaigns' })).toBeVisible()

  await page.getByRole('link', { name: /See the (details|recap)/ }).first().click()
  await expect(page).toHaveURL(/\/events\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Detail pages carry the event title in the document title (the recap
  // layout, like the live site, doesn't repeat it in the page body).
  await page.goto(`/events/${event.slug}`)
  await expect(page).toHaveTitle(new RegExp(event.title))
})

test('upcoming event shows tickets, sponsor packages and special opportunities tabs', async ({ page }) => {
  await page.goto('/events')
  const href = await page.getByRole('link', { name: 'See the details' }).first().getAttribute('href')
  // Navigate directly so the page's tab script has loaded before we click.
  await page.goto(href!)
  await expect(page.getByRole('heading', { level: 2, name: 'Tickets' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Sponsorship benefits by package' })).toBeVisible()

  const tabs = page.getByRole('tablist', { name: 'Special Event Opportunities' }).getByRole('tab')
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
  await tabs.nth(1).click()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel').filter({ visible: true })).toHaveCount(1)
})
