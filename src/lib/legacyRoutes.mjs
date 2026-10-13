// Live Webflow paths → this project's routes. Single source for the
// redirects (astro.config.mjs; 301 unless listed in TEMPORARY_REDIRECTS),
// page SEO lookup (scripts/migrate) and the sitemap coverage test
// (e2e/sitemap.spec.ts). Paths not listed are the same on both sites.
export const STATIC_REDIRECTS = {
  '/all-events': '/events',
  '/sponsor-a-child-list-page': '/sponsor-a-child/children',
  '/venezuela-earthquake-relief': '/earthquake-relief',
  '/resources-categories/all': '/resources',
  // Empty placeholder profile on live; its "Board seat open" card links to
  // the contact page, so the old URL goes there too.
  '/team-members/join-our-board': '/contact',
}

// Redirects that stand in for a page not built yet: 302, so browsers and
// search engines don't remember them once the page exists. (The financials
// page's stand-in was one; the page is built now.)
export const TEMPORARY_REDIRECTS = new Set()

export function redirectStatus(from) {
  return TEMPORARY_REDIRECTS.has(from.replace(/\/$/, '') || '/') ? 302 : 301
}

// Dynamic patterns, in Astro redirect syntax.
export const DYNAMIC_REDIRECTS = {
  '/team-members/[slug]': '/our-team/[slug]',
  '/children/[slug]': '/sponsor-a-child/children/[slug]',
  '/resources-categories/[category]': '/resources/category/[category]',
}

// Resolve a live path to its project path (identity when unchanged).
export function projectPathFor(livePath) {
  const path = livePath.replace(/\/$/, '') || '/'
  if (STATIC_REDIRECTS[path]) return STATIC_REDIRECTS[path]
  for (const [from, to] of Object.entries(DYNAMIC_REDIRECTS)) {
    const prefix = from.replace(/\[[^\]]+\]$/, '')
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
      return to.replace(/\[[^\]]+\]$/, path.slice(prefix.length))
    }
  }
  return path
}
