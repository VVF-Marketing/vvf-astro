import { readdirSync } from 'node:fs'
import { EmDashClient } from 'emdash/client'

// [slug].astro detail routes and their matching index.astro listing route
// are already represented by their own EmDash collection - excluded here so
// the `pages` collection only covers routes with no other EmDash presence.
const COLLECTION_INDEX_ROUTES = new Set([
  'blog/index.astro',
  'events/index.astro',
  'our-team/index.astro',
  'resources/index.astro',
  'sponsor-a-child/children/index.astro',
])

export interface StaticPageRoute {
  routePath: string
  sourceFile: string
}

function toRoutePath(relFile: string): string {
  const withoutIndex = relFile.replace(/(^|\/)index\.astro$/, '')
  const withoutExt = withoutIndex.replace(/\.astro$/, '')
  const route = `/${withoutExt}`.replace(/\/+/g, '/').replace(/\/$/, '')
  return route === '' ? '/' : route
}

export function scanStaticPageRoutes(pagesDir: string): StaticPageRoute[] {
  const entries = readdirSync(pagesDir, { recursive: true }) as string[]
  const relPaths = entries.map((entry) => entry.split(/[\\/]/).join('/'))

  return relPaths
    .filter((rel) => rel.endsWith('.astro'))
    .filter((rel) => !rel.includes('[')) // dynamic routes belong to a collection
    .filter((rel) => !COLLECTION_INDEX_ROUTES.has(rel))
    .map((rel) => ({
      routePath: toRoutePath(rel),
      sourceFile: `src/pages/${rel}`,
    }))
    .sort((a, b) => a.routePath.localeCompare(b.routePath))
}

export interface SyncStaticPagesOptions {
  baseUrl: string
  token: string
  pagesDir: string
}

export interface SyncStaticPagesResult {
  created: number
  updated: number
  markedStale: number
}

/**
 * Upserts one `pages` row per static route on disk, then flags any
 * previously-synced row whose route no longer exists as stale (never
 * deletes - see openspec/changes/expose-static-pages-to-emdash/design.md).
 */
export async function syncStaticPages(
  options: SyncStaticPagesOptions
): Promise<SyncStaticPagesResult> {
  const client = new EmDashClient({ baseUrl: options.baseUrl, token: options.token })
  const routes = scanStaticPageRoutes(options.pagesDir)
  const now = new Date().toISOString()

  let created = 0
  let updated = 0

  const seenRoutePaths = new Set<string>()

  for (const route of routes) {
    seenRoutePaths.add(route.routePath)
    const existing = await client.list('pages', {
      limit: 1,
      fieldFilters: { route_path: route.routePath },
    })
    const match = existing.items[0]

    if (match) {
      await client.update('pages', match.id, {
        data: {
          route_path: route.routePath,
          source_file: route.sourceFile,
          last_synced_at: now,
          stale: false,
        },
        _rev: match._rev,
      })
      updated += 1
    } else {
      // `create`'s status validation only accepts "draft" at creation time;
      // these rows have no real draft/publish workflow (see design.md
      // Non-Goals), so the value is inert either way.
      await client.create('pages', {
        status: 'draft',
        data: {
          route_path: route.routePath,
          source_file: route.sourceFile,
          last_synced_at: now,
          stale: false,
        },
      })
      created += 1
    }
  }

  let markedStale = 0
  for await (const item of client.listAll('pages')) {
    const routePath = item.data.route_path as string | undefined
    if (routePath && !seenRoutePaths.has(routePath) && item.data.stale !== true) {
      await client.update('pages', item.id, {
        data: { ...item.data, stale: true },
        _rev: item._rev,
      })
      markedStale += 1
    }
  }

  return { created, updated, markedStale }
}
