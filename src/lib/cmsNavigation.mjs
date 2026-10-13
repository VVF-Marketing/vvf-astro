// How the EmDash admin sidebar is organized (openspec/changes/
// organize-cms-admin-navigation): three folders, one copy collection per copy
// manifest under "Pages & SEO", every other site collection under "CMS
// collections" or "Banner", and system collections hidden. The seed
// (scripts/migrate/transform.mjs) and the schema apply script
// (scripts/cms-schema.mjs) both read this module, so it's the one place to
// change names, descriptions or order. Plain ESM so Node scripts can import it.
//
// EmDash's sidebar has one folder level; a folder sits where its first
// collection is, and collections keep their `sortOrder` inside it.

export const FOLDERS = {
  pages: 'Pages & SEO',
  collections: 'CMS collections',
  banner: 'Banner',
}

// Copy manifests, in sidebar order: main-menu pages first (menu order), then
// the other pages, then shared template text, with site-wide text last.
// `route` matches the manifest's route (src/lib/copy.ts).
export const COPY_PAGES = [
  { route: '/', name: 'Home' },
  { route: '/sponsor-a-child', name: 'Sponsor a Child' },
  { route: '/ways-to-give', name: 'Ways to Give' },
  { route: '/corporate-sponsorships', name: 'Corporate Sponsorships' },
  { route: '/events', name: 'Events (list page)' },
  { route: '/our-team', name: 'Our Team' },
  { route: '/our-programs', name: 'Our Programs' },
  { route: '/financials-and-transparency', name: 'Financials & Transparency' },
  { route: '/resources', name: 'Resources (list page)' },
  { route: '/resources/category/stories', name: 'Resources: Stories' },
  // Explicit slug: the derived one (47 characters) breaks EmDash's index names
  // on Postgres (63-character identifier limit; see collectionNames.test.ts).
  { route: '/resources/category/financials-transparency', name: 'Resources: Financials & Transparency', slug: 'copy_resources_financials' },
  { route: '/earthquake-relief', name: 'Earthquake Relief' },
  { route: '/sponsor-a-child/children', name: 'Children (list page)' },
  { route: '/blog', name: 'Blog (list page)' },
  { route: '/contact', name: 'Contact' },
  { route: '/privacy-policy', name: 'Privacy Policy' },
  { route: '/events/*', name: 'Event pages (shared text)', shared: 'every event page' },
  { route: '/resources/*', name: 'Resource pages (shared text)', shared: 'every resource page' },
  { route: '/blog/*', name: 'Blog post pages (shared text)', shared: 'every blog post' },
  { route: '_global', name: 'Site-wide text', shared: 'the header, footer, buttons and forms on every page' },
]

// EmDash collection slug for a copy manifest's route: `copy_` + the route
// with non-alphanumerics as `_` ('/' → copy_home, '/events/*' →
// copy_events_detail, '_global' → copy_site), unless the page sets an
// explicit `slug`. Slugs must fit Postgres' identifier limit (35 characters;
// src/lib/collectionNames.test.ts).
export function copyCollectionFor(route) {
  const explicit = COPY_PAGES.find((p) => p.route === route)?.slug
  if (explicit) return explicit
  if (route === '/') return 'copy_home'
  if (route === '_global') return 'copy_site'
  const base = route
    .replace(/\/\*$/, '/detail')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `copy_${base}`
}

export function copyPageFor(route) {
  return COPY_PAGES.find((p) => p.route === route)
}

export function isCopyCollection(slug) {
  return COPY_PAGES.some((p) => copyCollectionFor(p.route) === slug)
}

function copyDescription(page) {
  if (page.shared) return `Text and labels shown on ${page.shared}. Edit the text only; titles show where each piece appears.`
  return `Text and SEO (search title, description, share image) of the ${page.name} page (${page.route}). Edit the text only.`
}

// Other site collections, in sidebar order within their folder.
export const CONTENT_COLLECTIONS = [
  { slug: 'events', group: 'collections', label: 'Events', description: 'Events and campaigns, each with its own page under /events.' },
  { slug: 'posts', group: 'collections', label: 'Blog posts', description: 'Blog posts, listed on /blog with a page each.' },
  { slug: 'resources', group: 'collections', label: 'Resources', description: 'Stories, reports and downloads, listed on /resources and its categories.' },
  { slug: 'faqs', group: 'collections', label: 'FAQs', description: 'Questions and answers shown on Ways to Give, Sponsor a Child and event pages.' },
  { slug: 'testimonials', group: 'collections', label: 'Testimonials', description: 'Quotes from families, volunteers and partners, shown on Our Programs once published.' },
  { slug: 'team_members', group: 'collections', label: 'Team members', description: 'People on Our Team, each with a profile page.' },
  { slug: 'sponsors', group: 'collections', label: 'Sponsors / partners', description: 'Sponsor and partner logos shown on the home, event and sponsorship pages.' },
  { slug: 'sponsorship_packages', group: 'collections', label: 'Sponsorship packages', description: 'Packages and tiers shown on Corporate Sponsorships and event pages.' },
  { slug: 'auction_items', group: 'collections', label: 'Silent auction items', description: 'Items shown in an event’s silent auction section.' },
  { slug: 'campaign_updates', group: 'collections', label: 'Earthquake relief updates', labelSingular: 'Earthquake relief update', description: 'Updates shown on the Earthquake Relief page.' },
  { slug: 'children', group: 'collections', label: 'Children', labelSingular: 'Child', description: 'Sponsorship profiles. Restricted: only the safeguarding team can change them.' },
  {
    slug: 'campaign_settings',
    group: 'banner',
    label: 'Site banner',
    labelSingular: 'Site banner',
    description: 'The banner at the top of every page: its text and whether it shows.',
    fieldLabels: { active: 'Show the banner', banner_text: 'Banner text (shown at the top of every page)' },
  },
]

// System collections, kept out of the sidebar (still reachable by API, MCP
// and direct URL).
export const HIDDEN_COLLECTIONS = ['pages']

// Sidebar settings for every configured collection, keyed by slug: label,
// description, group (folder label), sortOrder and hidden. Copy collections
// come first so "Pages & SEO" is the first folder.
export function sidebarSettings() {
  const out = {}
  let order = 0
  for (const page of COPY_PAGES) {
    out[copyCollectionFor(page.route)] = {
      label: page.name,
      labelSingular: 'Text slot',
      description: copyDescription(page),
      group: FOLDERS.pages,
      sortOrder: (order += 1),
      hidden: false,
    }
  }
  for (const c of CONTENT_COLLECTIONS) {
    out[c.slug] = {
      label: c.label,
      ...(c.labelSingular ? { labelSingular: c.labelSingular } : {}),
      description: c.description,
      group: FOLDERS[c.group],
      sortOrder: (order += 1),
      hidden: false,
    }
  }
  for (const slug of HIDDEN_COLLECTIONS) out[slug] = { hidden: true, group: null }
  return out
}
