import { expect, test } from '@playwright/test'

// Endpoints only the platform calls (openspec/changes/run-on-vercel-functions):
// Vercel Cron's scheduled work and the pipeline's static-page sync.
test('refuse callers without their secret, uncached', async ({ request }) => {
  const cron = await request.get('/api/cron/emdash')
  expect(cron.status()).toBe(401)
  expect(cron.headers()['cache-control']).toBe('no-store')
  expect((await request.get('/api/cron/emdash', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)

  const sync = await request.post('/api/internal/sync-static-pages', { headers: { authorization: 'Bearer wrong' } })
  expect(sync.status()).toBe(401)
  expect(await sync.json()).toEqual({ ran: false })
})

test('have no Spanish copy', async ({ request }) => {
  expect((await request.get('/es/api/cron/emdash', { maxRedirects: 0 })).status()).toBe(404)
  expect((await request.post('/es/api/internal/sync-static-pages', { maxRedirects: 0 })).status()).toBe(404)
})

test('stay out of the sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).not.toMatch(/\/api\//)
})
