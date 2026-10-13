import { describe, expect, it } from 'vitest'
import { defineCopy } from './copy'
import { sitemapXml, staticManifests, staticPages } from './sitemap'

const site = 'https://www.example.org'

describe('staticManifests', () => {
  it('keeps single pages and drops detail templates and site-wide copy', () => {
    const ms = [defineCopy('/ways-to-give', {}), defineCopy('/events/*', {}), defineCopy('_global', {})]
    expect(staticManifests(ms).map((m) => m.route)).toEqual(['/ways-to-give'])
  })
})

describe('staticPages', () => {
  it('lists Spanish only for pages with their own Spanish copy', async () => {
    const ms = [defineCopy('/', {}), defineCopy('/our-programs', {})]
    const pages = await staticPages(ms, async (m) => (m.route === '/' ? ['en', 'es'] : ['en']))
    expect(pages).toEqual([{ en: '/', es: '/es' }, { en: '/our-programs' }])
  })
})

describe('sitemapXml', () => {
  it('writes every locale as its own URL with hreflang alternates and x-default', () => {
    const xml = sitemapXml(site, [{ en: '/', es: '/es' }, { en: '/our-programs' }, { en: '/' }])
    expect(xml.match(/<url>/g)).toHaveLength(3)
    expect(xml).toContain('<loc>https://www.example.org/es</loc>')
    expect(xml).toContain('hreflang="es-VE" href="https://www.example.org/es"')
    expect(xml).toContain('hreflang="x-default" href="https://www.example.org/"')
    expect(xml).toMatch(/<url><loc>https:\/\/www\.example\.org\/our-programs<\/loc><\/url>/)
  })

  it('escapes XML', () => {
    expect(sitemapXml(site, [{ en: '/a?b=1&c=2' }])).toContain('/a?b=1&amp;c=2')
  })
})
