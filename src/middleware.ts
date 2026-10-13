import { defineMiddleware } from 'astro:middleware'
import { after } from 'emdash'
import { syncStaticPages } from './lib/staticPageSync'
import { localeFromPath, stripLocale } from './lib/i18n'
import { localizeLinks } from './lib/localizeLinks'

// Runs once per process, on the first request - covers `astro dev` and the
// deployed `@astrojs/node` standalone server uniformly, since neither has a
// build-time hook with a live server to sync against (see
// openspec/changes/expose-static-pages-to-emdash/design.md).
let hasSynced = false

export const onRequest = defineMiddleware(async (context, next) => {
  if (!hasSynced) {
    hasSynced = true
    const token = import.meta.env.EMDASH_SYNC_PAT

    if (token) {
      after(async () => {
        const result = await syncStaticPages({
          baseUrl: context.url.origin,
          token,
          pagesDir: `${process.cwd()}/src/pages`,
        })
        console.log('[static-page-sync]', result)
      })
    } else {
      console.warn('[static-page-sync] EMDASH_SYNC_PAT not set, skipping sync')
    }
  }

  // Spanish pages are rendered from the shared (English-path) page modules,
  // which read their locale from Astro.originPathname; their internal links
  // are then pointed at /es (src/lib/localizeLinks.ts).
  const locale = localeFromPath(context.url.pathname)
  const path = stripLocale(context.url.pathname)
  if (locale === 'en' || path.startsWith('/_')) return next()
  const response = await next(path + context.url.search)
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const html = localizeLinks(await response.text(), locale)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
})
