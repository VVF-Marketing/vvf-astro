import { defineMiddleware } from 'astro:middleware'
import { EMDASH_SYNC_PAT } from 'astro:env/server'
import { after } from 'emdash'
import { manifestSources, pageFilesFromGlob, syncStaticPages } from './lib/staticPageSync'
import { localeFromPath, localizePath, stripLocale, type Locale } from './lib/i18n'
import { projectPathFor, redirectStatus } from './lib/legacyRoutes.mjs'
import { localizeLinks } from './lib/localizeLinks'
import { openExternalLinks } from './lib/externalLinks'
import { getGlobalCopy } from './lib/globalCopy'
import globalCopy from './copy/_copy'
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

// Every page file, resolved at build time (keys only; nothing is imported),
// so the sync needs no src/ directory at runtime (make-app-portable, D5).
const PAGE_FILES = pageFilesFromGlob(Object.keys(import.meta.glob('/src/pages/**/*.astro')))

const HEALTH_PATHS = new Set(['/healthz', '/readyz'])

export const onRequest = defineMiddleware(async (context, next) => {
  if (!hasSynced) {
    hasSynced = true
    // Read at runtime (astro:env secret), never baked into the build.
    const token = EMDASH_SYNC_PAT

    if (token) {
      const run = async () => {
        const result = await syncStaticPages({
          baseUrl: context.url.origin,
          token,
          pageFiles: PAGE_FILES,
          manifests: manifestSources(COPY_MANIFESTS, PAGE_FILES),
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
  // Webflow's /en/(.*) → /%1 (spec 2.6): one 301 to today's page.
  const en = context.url.pathname.match(/^\/en(\/.*)?$/)
  if (en) return context.redirect(projectPathFor(en[1] ?? '/') + context.url.search, 301)
  const locale = localeFromPath(context.url.pathname)
  const path = stripLocale(context.url.pathname)
  if (path.startsWith('/_')) return next()
  // Health endpoints: answered as-is, never localized or rewritten, and only
  // at their own path (no /es copy).
  if (HEALTH_PATHS.has(path)) return locale === 'en' ? next() : new Response('Not found', { status: 404 })
  if (locale === 'en') return withLocalizedLinks(await next(), locale, context)
  // Old Webflow /es URLs: one permanent redirect straight to the Spanish
  // project route (the English redirects in astro.config.mjs would otherwise
  // land Spanish visitors on English pages).
  const legacyTarget = projectPathFor(path)
  if (legacyTarget !== (path.replace(/\/$/, '') || '/')) return context.redirect(localizePath(legacyTarget, 'es') + context.url.search, redirectStatus(path))
  return withLocalizedLinks(await next(path + context.url.search), locale, context)
})

// The screen-reader cue for links that open in a new tab, in the page's
// language; the default from code if the CMS can't be read. It comes from the
// site copy the page itself loaded for this request (getGlobalCopy), so it
// costs no extra CMS query.
async function newTabCue(context: CueContext): Promise<string> {
  try {
    return (await getGlobalCopy(context))['a11y.newTab']
  } catch {
    return globalCopy.slots['a11y.newTab'].default
  }
}

type CueContext = { locals: object; originPathname: string }

async function withLocalizedLinks(response: Response, locale: Locale, context: CueContext): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  // Same-site links follow the page language; links to other sites open in
  // a new tab (src/lib/externalLinks.ts).
  const html = openExternalLinks(localizeLinks(await response.text(), locale), await newTabCue(context))
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
