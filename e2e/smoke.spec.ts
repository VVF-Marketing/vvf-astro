import { expect, test } from '@playwright/test'

// The smoke set (@smoke; openspec/changes/add-vercel-deploy-pipeline, D3): what
// only a real deployment can show. Each pull request's preview runs it
// (playwright.preview.config.ts), and so does a staged production deployment
// before it's promoted. The full suite runs in CI on SQLite and Postgres.

test('the database and media storage answer @smoke', async ({ request }) => {
  const ready = await request.get('/readyz')
  expect(ready.status()).toBe(200)
  expect(await ready.json()).toEqual({ db: true, storage: true })
})

test('the home page renders its content @smoke', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', /^en/)
  await expect(page.locator('main h1').first()).toBeVisible()
})

test('the Spanish home page renders @smoke', async ({ page }) => {
  const res = await page.goto('/es')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', /^es/)
})

test('a legacy Webflow URL redirects permanently @smoke', async ({ request }) => {
  const res = await request.get('/earthquake-relief', { maxRedirects: 0 })
  expect(res.status()).toBe(301)
  expect(new URL(res.headers().location, 'http://x').pathname).toBe('/venezuela-earthquake-relief')
})

test('a CMS image is served from media storage @smoke', async ({ page, request }) => {
  await page.goto('/')
  const src = await page.locator('img[src*="/_emdash/api/media/file/"]').first().getAttribute('src')
  expect(src, 'an image from the CMS on the home page').toBeTruthy()
  const res = await request.get(src!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/^image\//)
})

test('the admin login page opens @smoke', async ({ page }) => {
  const res = await page.goto('/_emdash/admin/login')
  expect(res?.status()).toBe(200)
})
