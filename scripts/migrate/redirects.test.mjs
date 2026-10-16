import { describe, expect, it } from 'vitest'
import { childRedirects, parseRedirectsCsv, resolveTarget } from './redirects.mjs'

const csv = `source,target
/old-page/,/resources-categories/all
/category/noticias,\t/es/resources-categories/news
/kid-full-name,/children/kid-f
/sponsor/kid-full-name,/es/children/kid-f
/en/(.*),/%1
`

describe('Webflow redirects', () => {
  it('parses rows and trims stray whitespace', () => {
    expect(parseRedirectsCsv(csv)[1]).toEqual({ source: '/category/noticias', target: '/es/resources-categories/news' })
  })

  it('resolves live targets through the URL map, keeping /es', () => {
    expect(resolveTarget('/resources-categories/all')).toBe('/resources')
    expect(resolveTarget('/es/resources-categories/news')).toBe('/es/resources/news')
    expect(resolveTarget('/es')).toBe('/es')
    expect(resolveTarget('/sponsor-a-child-list-page/')).toBe('/children')
  })

  it('keeps only exact redirects to child profiles for the local seed', () => {
    expect(childRedirects(parseRedirectsCsv(csv)).map((r) => [r.source, r.destination])).toEqual([
      ['/kid-full-name', '/children/kid-f'],
      ['/sponsor/kid-full-name', '/es/children/kid-f'],
    ])
  })
})
