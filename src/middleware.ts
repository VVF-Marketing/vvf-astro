import { defineMiddleware } from 'astro:middleware'
import { after } from 'emdash'
import { manifestSources, syncStaticPages } from './lib/staticPageSync'
import { localeFromPath, localizePath, stripLocale, type Locale } from './lib/i18n'
import { projectPathFor, redirectStatus } from './lib/legacyRoutes.mjs'
import { localizeLinks } from './lib/localizeLinks'
import type { CopyManifest } from './lib/copy'
import { guardEmDashApi } from './lib/emdashGuard'
import { activityChannel, runWithActivityActor } from './lib/activityContext'
import { normalizeApiPath } from './lib/marketingGuard'

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

  // EmDash API: non-admin CMS users (marketing) go through the guard, and
  // every request runs with its user and channel for the activity log.
  const apiPath = normalizeApiPath(context.url.pathname)
  if (apiPath.startsWith('/_emdash/api/')) {
    const user = (context.locals as { user?: { id: string; email: string; name?: string | null } }).user
    const actor = { user: user && { id: user.id, email: user.email, name: user.name }, channel: activityChannel(apiPath, context.request.headers) }
    return runWithActivityActor(actor, async () => (await guardEmDashApi(context, next)) ?? next())
  }

  // Spanish pages are rendered from the shared (English-path) page modules,
  // which read their locale from Astro.originPathname. On every page, links
  // back into the site are then pointed at the page's language
  // (src/lib/localizeLinks.ts).
  const locale = localeFromPath(context.url.pathname)
  const path = stripLocale(context.url.pathname)
  if (path.startsWith('/_')) return next()
  if (locale === 'en') return withLocalizedLinks(await next(), locale)
  // Old Webflow /es URLs: one permanent redirect straight to the Spanish
  // project route (the English redirects in astro.config.mjs would otherwise
  // land Spanish visitors on English pages).
  const legacyTarget = projectPathFor(path)
  if (legacyTarget !== (path.replace(/\/$/, '') || '/')) return context.redirect(localizePath(legacyTarget, 'es') + context.url.search, redirectStatus(path))
  return withLocalizedLinks(await next(path + context.url.search), locale)
})

async function withLocalizedLinks(response: Response, locale: Locale): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const html = localizeLinks(await response.text(), locale)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
