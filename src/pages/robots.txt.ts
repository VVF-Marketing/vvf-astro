// robots.txt (spec 2.4): one group, everything allowed, one Sitemap line on
// the site's own address. Replaces EmDash's, whose Sitemap line follows the
// request host. The CMS admin stays blocked until Q2 on the spec card
// (Basecamp 10392955622) is answered.
import type { APIRoute } from 'astro'
import { SITE_URL } from '../lib/site.mjs'

export const prerender = false

export const GET: APIRoute = () =>
  new Response(['User-agent: *', 'Allow: /', 'Disallow: /_emdash/', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
