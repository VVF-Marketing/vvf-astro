import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanStaticPageRoutes } from './staticPageSync'

const PAGES_DIR = path.join(process.cwd(), 'src/pages')

describe('scanStaticPageRoutes', () => {
  it('returns exactly the static, non-collection-backed routes', () => {
    const routes = scanStaticPageRoutes(PAGES_DIR).map((r) => r.routePath)

    expect(routes).toEqual([
      '/',
      '/contact',
      '/corporate-sponsorships',
      '/earthquake-relief',
      '/privacy-policy',
      '/sponsor-a-child',
      '/ways-to-give',
    ])
  })

  it('excludes collection-detail and collection-index routes', () => {
    const routes = scanStaticPageRoutes(PAGES_DIR).map((r) => r.routePath)

    expect(routes).not.toContain('/blog')
    expect(routes).not.toContain('/events')
    expect(routes).not.toContain('/our-team')
    expect(routes).not.toContain('/sponsor-a-child/children')
    expect(routes).not.toContain('/resources')
    expect(routes.some((r) => r.includes('['))).toBe(false)
  })

  it('records the source file alongside each route', () => {
    const routes = scanStaticPageRoutes(PAGES_DIR)
    const contact = routes.find((r) => r.routePath === '/contact')

    expect(contact?.sourceFile).toBe('src/pages/contact/index.astro')
  })
})
