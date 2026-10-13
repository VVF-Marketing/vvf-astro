// The site's sitemap (src/lib/sitemap.ts). Defining it here replaces
// EmDash's own /sitemap.xml, which only lists collections with a URL pattern.
import type { APIRoute } from 'astro'
import { getPageCopy, getSitemapDetailPages } from '../lib/content'
import type { CopyManifest } from '../lib/copy'
import { sitemapXml, staticPages } from '../lib/sitemap'

export const prerender = false

const MANIFESTS = Object.values(
  import.meta.glob<{ default: CopyManifest | CopyManifest[] }>('/src/pages/**/_copy.ts', { eager: true })
).flatMap((m) => (Array.isArray(m.default) ? m.default : [m.default]))

export const GET: APIRoute = async ({ site, url }) => {
  const [pages, details] = await Promise.all([
    staticPages(MANIFESTS, async (m) => (await getPageCopy(m, 'es')).locales),
    getSitemapDetailPages(),
  ])
  return new Response(sitemapXml(site ?? url, [...pages, ...details]), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}
