// sitemap.xml for the whole site (review finding on PR #12: EmDash's own
// sitemap only lists collections with a URL pattern, so it was empty).
//
// One <url> per canonical page, with the same hreflang alternates the page
// itself declares (Layout.astro): static pages from their copy manifests
// (Spanish listed only when the page has its own Spanish copy), CMS detail
// pages, child profiles included (spec 2.4, Q1), from their per-locale slugs,
// with the entry's last update as <lastmod>.
import type { CopyManifest } from './copy'
import { LANG_TAGS, pageAlternates, type Locale } from './i18n'

export type Alternates = Partial<Record<Locale, string>>

// A page with the date its content last changed (YYYY-MM-DD), when known.
export interface SitemapPage {
  alternates: Alternates
  lastmod?: string
}

// Pages kept out of search results (spec 2.4): the thank-you pages carry
// `noindex` and aren't listed.
export const NOINDEX_ROUTES = ['/thank-you-sponsorship', '/thank-you-donation', '/thank-you-earthquake-relief']

// Copy manifests that belong to a single, indexable static page (not detail
// templates such as `/events/*`, not the site-wide copy).
export function staticManifests(manifests: CopyManifest[]): CopyManifest[] {
  return manifests.filter((m) => m.route.startsWith('/') && !m.route.includes('*') && !NOINDEX_ROUTES.includes(m.route))
}

export async function staticPages(manifests: CopyManifest[], localesFor: (m: CopyManifest) => Promise<Locale[]>): Promise<Alternates[]> {
  return Promise.all(staticManifests(manifests).map(async (m) => pageAlternates(m.route, await localesFor(m))))
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Every locale of a page is its own canonical URL; each lists all of them.
export function sitemapXml(site: URL | string, pages: (Alternates | SitemapPage)[]): string {
  const abs = (p: string) => escapeXml(new URL(p, site).href)
  const seen = new Set<string>()
  const urls: string[] = []
  for (const page of pages) {
    const { alternates, lastmod } = 'alternates' in page ? (page as SitemapPage) : { alternates: page as Alternates, lastmod: undefined }
    const entries = Object.entries(alternates) as [Locale, string][]
    const links =
      entries.length > 1
        ? [
            ...entries.map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${LANG_TAGS[l]}" href="${abs(p)}"/>`),
            ...(alternates.en ? [`<xhtml:link rel="alternate" hreflang="x-default" href="${abs(alternates.en)}"/>`] : []),
          ]
        : []
    for (const [, path] of entries) {
      const loc = abs(path)
      if (seen.has(loc)) continue
      seen.add(loc)
      urls.push(`<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${links.join('')}</url>`)
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}
