import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const pageSeo = JSON.parse(readFileSync(new URL('../src/data/page-seo.json', import.meta.url), 'utf-8'))
const SITE = 'https://www.victoriavenezuelafoundation.org'

test('static page uses the live title, description, canonical and share image', async ({ page }) => {
  const live = pageSeo['/corporate-sponsorships']
  await page.goto('/corporate-sponsorships')
  await expect(page).toHaveTitle(live.title)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', live.description)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/corporate-sponsorships`)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${SITE}${live.image}`)
})

test('resource page uses its CMS SEO fields', async ({ page }) => {
  await page.goto('/resources/impact-report-2025')
  await expect(page).toHaveTitle('Impact Report 2025 | Victoria Venezuela Foundation')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /2025 Impact Report/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/_emdash\/api\/media\/file\//)
})
