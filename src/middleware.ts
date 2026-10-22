import { defineMiddleware } from 'astro:middleware'
import { EMDASH_SYNC_PAT, VERCEL_AUTOMATION_BYPASS_SECRET } from 'astro:env/server'
import { after } from 'emdash'
import { runStaticPageSync } from './lib/staticPageSyncRunner'
import { createSettingsGuard } from './lib/settingsGuard'
import { localeFromPath, localizePath, stripLocale, type Locale } from './lib/i18n'
import { projectPathFor, redirectStatus } from './lib/legacyRoutes.mjs'
import { localizeLinks } from './lib/localizeLinks'
import { openExternalLinks } from './lib/externalLinks'
import { getGlobalCopy } from './lib/globalCopy'
import globalCopy from './copy/_copy'
import { guardEmDashApi } from './lib/emdashGuard'
import { activityChannel, runWithActivityActor } from './lib/activityContext'
import { normalizeApiPath } from './lib/marketingGuard'
import { withMediaCdnCache } from './lib/mediaCdnCache'

// Runs once per process, on the first request - covers `astro dev` and the
// deployed `@astrojs/node` standalone server uniformly, since neither has a
// build-time hook with a live server to sync against (see
// openspec/changes/expose-static-pages-to-emdash/design.md). On Postgres the
// sync is also once per deployment, so new Vercel instances (or containers)
// of the same build skip it (run-on-vercel-functions, D5).
let hasSynced = false

// One sync at a time, across dev-server hot reloads (which re-run this module
// and reset `hasSynced`): overlapping runs would each see a partial state and
// create duplicate rows.
const syncState = globalThis as typeof globalThis & { __staticPageSync?: Promise<unknown> }

// On Vercel no launcher checks the required settings, so the middleware does
// (run-on-vercel-functions, D2), using the build's mode.
const settingsGuard =
  import.meta.env.DEPLOY_TARGET === 'vercel'
    ? createSettingsGuard({
        env: process.env,
        mode: { DEPLOY_TARGET: import.meta.env.DEPLOY_TARGET, DB_ADAPTER: import.meta.env.DB_ADAPTER, STORAGE: import.meta.env.STORAGE },
      })
    : null

// Endpoints only platforms call: health checks, Vercel Cron, the deploy
// pipeline's sync.
const HEALTH_PATHS = new Set(['/healthz', '/readyz'])
const isPlatformPath = (path: string) => HEALTH_PATHS.has(path) || path.startsWith('/api/cron/') || path.startsWith('/api/internal/')

export const onRequest = defineMiddleware(async (context, next) => {
  const unavailable = settingsGuard?.(context.url.pathname)
  if (unavailable) return unavailable

  if (!hasSynced) {
    hasSynced = true
    // Read at runtime (astro:env secret), never baked into the build.
    const token = EMDASH_SYNC_PAT

    if (token) {
      const run = async () => {
        const outcome = await runStaticPageSync({ baseUrl: context.url.origin, token, bypassSecret: VERCEL_AUTOMATION_BYPASS_SECRET })
        console.log('[static-page-sync]', outcome.ran ? outcome.result : `skipped (${outcome.reason})`)
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
    const response = await runWithActivityActor(actor, async () => (await guardEmDashApi(context, next)) ?? next())
    // Media files: a short CDN cache on Vercel (src/lib/mediaCdnCache.ts).
    return import.meta.env.DEPLOY_TARGET === 'vercel' ? withMediaCdnCache(apiPath, context.request.method, response) : response
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
  // Platform endpoints: answered as-is, never localized or rewritten, and only
  // at their own path (no /es copy).
  if (isPlatformPath(path)) return locale === 'en' ? next() : new Response('Not found', { status: 404 })
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
