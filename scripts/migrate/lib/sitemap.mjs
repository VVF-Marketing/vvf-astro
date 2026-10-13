// Parses the live sitemap into English-only URLs grouped by content type.
// Spanish (`/es`) URLs are dropped here so no later step can fetch them.

const COLLECTION_PREFIXES = {
  'team-members': 'team_members',
  children: 'children',
  events: 'events',
  resources: 'resources',
}

export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

export function isSpanish(url) {
  const { pathname } = new URL(url)
  return pathname === '/es' || pathname.startsWith('/es/')
}

// Returns { pages: [{ key, path, url }], items: { team_members: [{ slug, url }], ... } }
export function classifyUrls(urls) {
  const pages = []
  const items = Object.fromEntries(Object.values(COLLECTION_PREFIXES).map((c) => [c, []]))
  for (const url of urls) {
    if (isSpanish(url)) continue
    const { pathname } = new URL(url)
    const segments = pathname.split('/').filter(Boolean)
    const collection = segments.length === 2 ? COLLECTION_PREFIXES[segments[0]] : undefined
    if (collection) {
      items[collection].push({ slug: segments[1], url })
    } else {
      const key = segments.length === 0 ? 'home' : segments.join('__')
      pages.push({ key, path: pathname || '/', url })
    }
  }
  return { pages, items }
}
