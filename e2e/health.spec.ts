import { expect, test } from '@playwright/test'

// Health endpoints for platforms (openspec/changes/make-app-portable, D7).
test('liveness and readiness answer, uncached', async ({ request }) => {
  const live = await request.get('/healthz')
  expect(live.status()).toBe(200)
  expect(await live.text()).toBe('ok')
  expect(live.headers()['cache-control']).toBe('no-store')

  const ready = await request.get('/readyz')
  expect(ready.status()).toBe(200)
  expect(await ready.json()).toEqual({ db: true, storage: true })
  expect(ready.headers()['cache-control']).toBe('no-store')
})

test('health endpoints have no Spanish copy and stay out of the sitemap', async ({ request }) => {
  expect((await request.get('/es/healthz', { maxRedirects: 0 })).status()).toBe(404)
  expect((await request.get('/es/readyz', { maxRedirects: 0 })).status()).toBe(404)
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).not.toMatch(/healthz|readyz/)
})
