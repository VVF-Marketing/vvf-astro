import { expect, test } from '@playwright/test'
import { firstPost } from './fixtures'

test('blog list renders posts and links to a detail page that renders', async ({ page }) => {
  const post = firstPost()

  await page.goto('/blog')
  await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
  await expect(page.locator('[data-post-card]').first()).toBeVisible()

  await page.locator('[data-post-card]', { hasText: post.title }).getByRole('link').first().click()
  await expect(page).toHaveURL(new RegExp(`/blog/${post.slug}$`))
  await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible()
})
