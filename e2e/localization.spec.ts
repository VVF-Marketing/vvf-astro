import { expect, test } from '@playwright/test'
import { firstBoardMember, firstEvent, firstPost } from './fixtures'

const SITE = 'https://www.victoriavenezuelafoundation.org'

test('every static page is served under /es', async ({ request }) => {
  for (const path of ['/', '/ways-to-give', '/sponsor-a-child', '/events', '/our-team', '/contact', '/resources']) {
    const res = await request.get(path === '/' ? '/es' : `/es${path}`)
    expect(res.status(), path).toBe(200)
  }
})

test('/en is not a duplicate of the unprefixed English site', async ({ request }) => {
  expect((await request.get('/en/ways-to-give')).status()).toBe(404)
})

test('a Spanish page links to Spanish routes', async ({ page }) => {
  await page.goto('/es/ways-to-give')
  const internal = await page.locator('main a[href^="/"]').evaluateAll((links) =>
    links.map((a) => a.getAttribute('href')!).filter((href) => !/^\/(_emdash|images|uploads)\//.test(href))
  )
  expect(internal.length).toBeGreaterThan(0)
  for (const href of internal) expect(href).toMatch(/^\/es(\/|$)/)
})

test('a CMS item missing in Spanish falls back to English', async ({ page }) => {
  const event = firstEvent()
  const res = await page.goto(`/es/events/${event.slug}`)
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('a CMS item missing in both locales returns 404', async ({ request }) => {
  expect((await request.get('/es/events/does-not-exist')).status()).toBe(404)
  expect((await request.get('/es/resources/does-not-exist')).status()).toBe(404)
})

test('pages declare their language', async ({ page }) => {
  await page.goto('/ways-to-give')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
  await page.goto('/es/ways-to-give')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-VE')
})

test('an untranslated page under /es is canonicalized to English with no es-VE alternate', async ({ page }) => {
  // Blog posts are project-only and have no Spanish versions.
  const post = firstPost()
  await page.goto(`/es/blog/${post.slug}`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/blog/${post.slug}`)
  await expect(page.locator('link[rel="alternate"][hreflang="es-VE"]')).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('lang', 'en-US')
})

test('a translated page is its own canonical and lists both locales', async ({ page }) => {
  const event = firstEvent()
  await page.goto(`/es/events/${event.slug}`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/es/events/${event.slug}`)
  await expect(page.locator('link[rel="alternate"][hreflang="es-VE"]')).toHaveAttribute('href', `${SITE}/es/events/${event.slug}`)
  await expect(page.locator('link[rel="alternate"][hreflang="en-US"]')).toHaveAttribute('href', `${SITE}/events/${event.slug}`)
  await expect(page.locator('main')).not.toHaveAttribute('lang', /.+/)
  await page.goto(`/events/${event.slug}`)
  await expect(page.locator('link[rel="alternate"][hreflang="es-VE"]')).toHaveAttribute('href', `${SITE}/es/events/${event.slug}`)
})

test('Spanish pages show the live Spanish copy', async ({ page }) => {
  await page.goto('/es')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Transforma la vida de un niño en Venezuela')
  await expect(page).toHaveTitle(/Fundación Victoria Venezuela/)
})

test('an English page is its own canonical', async ({ page }) => {
  await page.goto('/ways-to-give')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/ways-to-give`)
})

test('the language switch leads to the same page in the other locale', async ({ page }) => {
  const member = firstBoardMember()
  await page.goto(`/our-team/${member.slug}`)
  const nav = page.getByRole('navigation', { name: 'Primary' }).first()
  await nav.getByRole('link', { name: 'Español' }).click()
  await expect(page).toHaveURL(new RegExp(`/es/our-team/${member.slug}$`))
  await expect(page.getByRole('heading', { name: member.name })).toBeVisible()

  await nav.getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(new RegExp(`/our-team/${member.slug}$`))
  await expect(page).not.toHaveURL(/\/es\//)
})

test('a Spanish page shows the Spanish menu, linking to /es routes', async ({ page }) => {
  await page.goto('/es/our-team')
  const nav = page.getByRole('navigation', { name: 'Primary' }).first()
  await expect(nav.locator(':scope > ul > li > :first-child')).toHaveText(['Marca la diferencia', 'Participa', 'Nuestro equipo', 'Recursos'])
  await expect(nav.getByRole('link', { name: 'Nuestro equipo' })).toHaveAttribute('href', '/es/our-team')
  await expect(nav.getByRole('link', { name: 'Nuestro equipo' })).toHaveAttribute('aria-current', 'page')
  const menuLinks = await nav.locator(':scope > ul a').evaluateAll((links) => links.map((a) => a.getAttribute('href')))
  for (const href of menuLinks) expect(href).toMatch(/^\/es\//)
})

test('old Spanish Webflow URLs redirect once to the Spanish project route', async ({ request }) => {
  for (const [from, to] of [
    ['/es/all-events', '/es/events'],
    ['/es/team-members/randy-lander', '/es/our-team/randy-lander'],
    ['/es/resources-categories/stories', '/es/resources/category/stories'],
    ['/es/venezuela-earthquake-relief', '/es/earthquake-relief'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status(), from).toBe(301)
    expect(new URL(res.headers()['location'], 'http://x').pathname, from).toBe(to)
  }
})
