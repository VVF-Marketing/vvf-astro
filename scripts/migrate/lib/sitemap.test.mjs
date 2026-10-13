import { describe, expect, it } from 'vitest'
import { classifyUrls, isSpanish, parseSitemap } from './sitemap.mjs'

const BASE = 'https://www.example.org'
const xml = `<?xml version="1.0"?><urlset>
<url><loc>${BASE}</loc></url>
<url><loc>${BASE}/es</loc></url>
<url><loc>${BASE}/our-team</loc></url>
<url><loc>${BASE}/es/our-team</loc></url>
<url><loc>${BASE}/team-members/ana-example</loc></url>
<url><loc>${BASE}/es/team-members/ana-example</loc></url>
<url><loc>${BASE}/children/test-c</loc></url>
<url><loc>${BASE}/resources-categories/stories</loc></url>
<url><loc>${BASE}/resources/example-report</loc></url>
</urlset>`

describe('sitemap', () => {
  it('detects Spanish URLs', () => {
    expect(isSpanish(`${BASE}/es`)).toBe(true)
    expect(isSpanish(`${BASE}/es/contact`)).toBe(true)
    expect(isSpanish(`${BASE}/estates`)).toBe(false)
  })

  it('drops every /es URL and groups collection items', () => {
    const { pages, items } = classifyUrls(parseSitemap(xml))
    const all = [...pages.map((p) => p.url), ...Object.values(items).flat().map((i) => i.url)]
    expect(all.some(isSpanish)).toBe(false)
    expect(pages.map((p) => p.key)).toEqual(['home', 'our-team', 'resources-categories__stories'])
    expect(items.team_members).toEqual([{ slug: 'ana-example', url: `${BASE}/team-members/ana-example` }])
    expect(items.children.map((c) => c.slug)).toEqual(['test-c'])
    expect(items.resources.map((r) => r.slug)).toEqual(['example-report'])
  })
})
