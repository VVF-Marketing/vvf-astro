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
  // Pages moved to the spec's URL map (openspec change audit-build-against-site-spec)
  // keep their copy collection, so stored text and translations stay put.
  { route: '/events-and-campaigns', name: 'Events & Campaigns (list page)', slug: 'copy_events' },
  { route: '/our-team', name: 'Our Team' },
  { route: '/our-programs', name: 'Our Programs' },
  { route: '/financials-and-transparency', name: 'Financials & Transparency' },
  { route: '/resources', name: 'Resources (list page)' },
  { route: '/resources/stories', name: 'Resources: Stories', slug: 'copy_resources_category_stories' },
  // Explicit slug: the derived one (47 characters) breaks EmDash's index names
  // on Postgres (63-character identifier limit; see collectionNames.test.ts).
  { route: '/resources/financials', name: 'Resources: Financial Reports', slug: 'copy_resources_financials' },
  { route: '/resources/news', name: 'Resources: News', slug: 'copy_resources_news' },
  { route: '/venezuela-earthquake-relief', name: 'Earthquake Relief', slug: 'copy_earthquake_relief' },
  { route: '/children', name: 'Children (list page)', slug: 'copy_sponsor_a_child_children' },
  { route: '/contact', name: 'Contact' },
  { route: '/privacy-policy', name: 'Privacy Policy' },
  { route: '/thank-you-sponsorship', name: 'Thank you: sponsorship' },
  { route: '/thank-you-donation', name: 'Thank you: donation' },
  { route: '/thank-you-earthquake-relief', name: 'Thank you: earthquake relief', slug: 'copy_thank_you_earthquake' },
  { route: '/events/*', name: 'Event pages (shared text)', shared: 'every event page' },
  { route: '/resources/*', name: 'Resource pages (shared text)', shared: 'every resource page' },
  { route: '/children/*', name: 'Child profiles (shared text)', shared: 'every child profile', slug: 'copy_children_detail' },
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
  // The content model (src/lib/contentModel.mjs, spec Appendix B).
  { slug: 'events', group: 'collections', label: 'Events', description: 'One item per event edition, with its page under /events, listed on /events-and-campaigns.' },
  { slug: 'event_offers', group: 'collections', label: 'Event offers', description: 'Tickets, sponsorship packages and special opportunities, picked on each event.' },
  { slug: 'benefit_rows', group: 'collections', label: 'Event benefit rows', description: "Rows of an event's sponsorship benefits grid." },
  { slug: 'auction_items', group: 'collections', label: 'Silent auction items', description: 'Items shown in an event’s silent auction section. Never winners or bids.' },
  { slug: 'testimonials', group: 'collections', label: 'Testimonials', description: 'Quotes shown on event recaps.' },
  { slug: 'articles', group: 'collections', label: 'Articles', description: 'Stories, news, reports and press coverage, listed on /resources and its categories.' },
  { slug: 'categories', group: 'collections', label: 'Article categories', description: 'Stories, Financial Reports and News, each listed at /resources/<category>.' },
  { slug: 'authors', group: 'collections', label: 'Authors', description: 'Article bylines, linked to the team bio when the author is on the team.' },
  { slug: 'faqs', group: 'collections', label: 'FAQs', description: 'Questions and answers; tick the pages each one shows on. Events pick their own.' },
  { slug: 'team_members', group: 'collections', label: 'Team members', description: 'One record per person, each with a bio page under /our-team.' },
  { slug: 'partners', group: 'collections', label: 'Partners', description: 'Sponsor and partner logos for every logo strip.' },
  { slug: 'site_facts', group: 'collections', label: 'Site facts', description: 'Impact figures shown across the site, each with its period and source.' },
  { slug: 'children', group: 'collections', label: 'Children', labelSingular: 'Child', description: 'Sponsorship profiles. Restricted: only the safeguarding team can change them.' },
  // Other site collections.
  { slug: 'corporate_tiers', group: 'collections', label: 'Corporate sponsorship tiers', description: 'The four tiers on Corporate Sponsorships.' },
  { slug: 'donorbox_settings', group: 'collections', label: 'Donorbox campaigns', description: 'The Donorbox campaign IDs every donate button and form uses. Change them here only.' },
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
