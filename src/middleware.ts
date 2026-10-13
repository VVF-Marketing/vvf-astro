import { defineMiddleware } from 'astro:middleware'
import { after } from 'emdash'
import { manifestSources, syncStaticPages } from './lib/staticPageSync'
import { localeFromPath, stripLocale } from './lib/i18n'
import { localizeLinks } from './lib/localizeLinks'
import type { CopyManifest } from './lib/copy'

// Runs once per process, on the first request - covers `astro dev` and the
// deployed `@astrojs/node` standalone server uniformly, since neither has a
// build-time hook with a live server to sync against (see
// openspec/changes/expose-static-pages-to-emdash/design.md).
let hasSynced = false

// One sync at a time, across dev-server hot reloads (which re-run this module
// and reset `hasSynced`): overlapping runs would each see a partial state and
// create duplicate rows.
const syncState = globalThis as typeof globalThis & { __staticPageSync?: Promise<unknown> }

// Copy slot manifests (src/lib/copy.ts): one `_copy.ts` per page, a
// `_copy.detail.ts` per collection detail template, plus the site-wide one.
// Bundled at build time, so the deployed server has them too.
const COPY_MANIFESTS = import.meta.glob<{ default: CopyManifest | CopyManifest[] }>(
  ['/src/pages/**/_copy.ts', '/src/pages/**/_copy.detail.ts', '/src/copy/_copy.ts'],
  { eager: true }
)

export const onRequest = defineMiddleware(async (context, next) => {
  if (!hasSynced) {
    hasSynced = true
    const token = import.meta.env.EMDASH_SYNC_PAT

    if (token) {
      const run = async () => {
        const result = await syncStaticPages({
          baseUrl: context.url.origin,
          token,
          pagesDir: `${process.cwd()}/src/pages`,
          manifests: manifestSources(COPY_MANIFESTS, process.cwd()),
        })
        console.log('[static-page-sync]', result)
      }
      const queued = (syncState.__staticPageSync ?? Promise.resolve()).catch(() => {}).then(run)
      syncState.__staticPageSync = queued
      after(() => queued)
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
