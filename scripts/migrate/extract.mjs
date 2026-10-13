// Step 1: live site → scripts/migrate/snapshot/*.json
//
// Crawls the live sitemap's URLs, once per locale, and parses each page type
// into the snapshot shape: English into snapshot/, Spanish (/es, same slugs as
// English) into snapshot/es/. Spanish pages are parsed with their /es link
// prefix removed, so the same parsers (which read slugs from links) apply. When Webflow API credentials are configured and
// accepted, the raw API collections/items are also dumped to
// snapshot/api/ for field-level review.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fetchText, HttpError } from './lib/http.mjs'
import {
  parseChild,
  parseChildList,
  parseCorporateTiers,
  parseEvent,
  parseEventList,
  parseFaqs,
  parseNextPageHref,
  parsePage,
  parseResource,
  parseResourceList,
  parseSponsorLogos,
  load,
  parseTeamIndex,
  parseTeamMember,
} from './lib/parse.mjs'
import { LIVE_BASE_URL, SNAPSHOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'
import { classifyUrls, isSpanish, parseSitemap } from './lib/sitemap.mjs'
import { apiCredentials, checkAccess, getCollection, listCollections, listLiveItems } from './lib/webflow-api.mjs'

export const LOCALES = ['en', 'es']
const PREFIX = { en: '', es: '/es' }

function writeSnapshot(name, data) {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

// Spanish page links → their English-path form (`/es/x` → `/x`, `/es` → `/`).
export function stripSpanishLinks(html) {
  const origin = LIVE_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html
    .replace(new RegExp(`(href|action)="(${origin})?/es"`, 'g'), '$1="$2/"')
    .replace(new RegExp(`(href|action)="(${origin})?/es/`, 'g'), '$1="$2/')
}

async function getFor(locale, url) {
  if (locale === 'en' && isSpanish(url)) throw new Error(`Refusing to fetch Spanish URL ${url} for English`)
  const html = await fetchText(url)
  return locale === 'es' ? stripSpanishLinks(html) : html
}

// Follows Webflow collection-list pagination (`?<id>_page=2`).
async function getPaginated(get, url, parse) {
  const results = []
  for (let next = url, guard = 0; next && guard < 20; guard++) {
    const html = await get(next)
    results.push(...parse(html))
    const href = parseNextPageHref(html)
    next = href ? new URL(href, url).href : undefined
  }
  return results
}

async function dumpApi(creds, report) {
  try {
    await checkAccess(creds)
  } catch (err) {
    if (err instanceof HttpError && (err.status === 401 || err.status === 403)) {
      report.line(`- Webflow API: rejected (HTTP ${err.status}); using sitemap scrape only.`)
      return
    }
    throw err
  }
  const collections = await listCollections(creds)
  for (const c of collections) {
    const [schema, items] = await Promise.all([getCollection(creds, c.id), listLiveItems(creds, c.id)])
    writeSnapshot(`api/${c.slug}`, { schema, items })
  }
  report.line(`- Webflow API: dumped ${collections.length} collections to \`snapshot/api/\`.`)
}

export async function extract() {
  const report = createSection('Extraction')
  report.line(`Run: ${new Date().toISOString()} against ${LIVE_BASE_URL}`)
  report.line()

  const creds = apiCredentials()
  if (creds) await dumpApi(creds, report)
  else report.line('- Webflow API: no `WEBFLOW_API_TOKEN`/`WEBFLOW_SITE_ID`; using sitemap scrape.')
  report.line('- Source for normalized snapshot: sitemap HTML scrape (English, then Spanish under `snapshot/es/`).')

  const sitemapUrls = parseSitemap(await fetchText(`${LIVE_BASE_URL}/sitemap.xml`))
  const counts = {}
  for (const locale of LOCALES) counts[locale] = await extractLocale(locale, sitemapUrls, report)
  report.write()
  return counts
}

async function extractLocale(locale, sitemapUrls, report) {
  const get = (url) => getFor(locale, url)
  const base = `${LIVE_BASE_URL}${PREFIX[locale]}`
  const snap = (name, data) => writeSnapshot(locale === 'en' ? name : `${locale}/${name}`, data)
  // Classify by English path; fetch the locale's URL.
  const localeUrls = sitemapUrls.filter((u) => (locale === 'es') === isSpanish(u))
  const enUrls = localeUrls.map((u) => (locale === 'es' ? `${LIVE_BASE_URL}${new URL(u).pathname.replace(/^\/es/, '') || '/'}` : u))
  const toLocale = (url) => (locale === 'es' ? `${LIVE_BASE_URL}/es${new URL(url).pathname === '/' ? '' : new URL(url).pathname}` : url)
  const { pages: enPages, items: enItems } = classifyUrls(enUrls)
  const pages = enPages.map((p) => ({ ...p, url: toLocale(p.url) }))
  const items = Object.fromEntries(Object.entries(enItems).map(([k, list]) => [k, list.map((i) => ({ ...i, url: toLocale(i.url) }))]))
  report.line()
  report.line(`### ${locale === 'en' ? 'English' : 'Spanish (/es)'}`)
  // Committed (public repo): child detail URLs carry children's names, so
  // they're left out here and live only in the gitignored children snapshot.
  const paths = localeUrls.map((u) => new URL(u).pathname || '/')
  const isChildPath = (p) => /^(\/es)?\/children\//.test(p)
  snap('sitemap', {
    urls: paths.filter((p) => !isChildPath(p)),
    childUrlCount: paths.filter(isChildPath).length,
  })

  // Static pages (structure + SEO) — also the source of page-level FAQs.
  const faqsByPage = {}
  const pageSnapshots = {}
  for (const page of pages) {
    const html = await get(page.url)
    pageSnapshots[page.key] = { path: page.path, ...parsePage(html) }
    const faqs = parseFaqs(html)
    if (faqs.length) faqsByPage[page.key] = faqs
  }

  // Team: index gives tiers/per-tier roles; detail pages give bios.
  const teamIndex = parseTeamIndex(await get(`${base}/our-team`))
  const members = {}
  for (const { slug, url } of items.team_members) members[slug] = { url, ...parseTeamMember(await get(url)) }
  snap('team_members', { sections: teamIndex, members })

  // Children: listing gives display order; detail pages give fields.
  const childOrder = await getPaginated(get, `${base}/sponsor-a-child-list-page`, parseChildList)
  const children = []
  for (const { slug, url } of items.children) children.push({ slug, url, ...parseChild(await get(url)) })
  snap('children', { order: childOrder, items: children })

  // Events: listing gives card copy + past/upcoming; detail the rest.
  const eventList = parseEventList(await get(`${base}/all-events`))
  const events = []
  for (const { slug, url } of items.events) {
    const html = await get(url)
    events.push({ slug, url, card: eventList.find((e) => e.slug === slug), ...parseEvent(html) })
    // Event templates carry page-level sections (benefits grid, memories)
    // that aren't CMS fields; keep their outline for page recomposition.
    pageSnapshots[`events__${slug}`] = { path: new URL(url).pathname, ...parsePage(html) }
  }
  snap('events', events)

  // Page snapshots are committed (public repo): strip every child name and
  // photo before writing them.
  let scrubbed = 0
  for (const [key, pageSnap] of Object.entries(pageSnapshots)) {
    const result = scrubChildren(pageSnap, children)
    scrubbed += result.removed
    snap(`pages/${key}`, result.snapshot)
  }

  // Resources: category pages give category membership, date, excerpt.
  const categoryPages = pages.filter((p) => p.path.startsWith('/resources-categories/'))
  const cards = {}
  const categories = {}
  for (const page of categoryPages) {
    const category = page.path.split('/').pop()
    for (const card of await getPaginated(get, page.url, parseResourceList)) {
      cards[card.slug] ??= card
      if (category !== 'all') (categories[card.slug] ??= new Set()).add(category)
    }
  }
  const resources = []
  for (const { slug, url } of items.resources) {
    resources.push({
      slug,
      url,
      categories: [...(categories[slug] ?? [])],
      card: cards[slug],
      ...parseResource(await get(url)),
    })
  }
  snap('resources', resources)

  snap('corporate_tiers', parseCorporateTiers(await get(`${base}/corporate-sponsorships`)))
  // Home "Corporate Partners" CMS list (in display order).
  snap('partners', parseSponsorLogos(load(await get(`${base}/`)), '.section_partners .w-dyn-items'))
  snap('faqs', faqsByPage)

  const counts = {
    pages: pages.length,
    team_members: Object.keys(members).length,
    children: children.length,
    events: events.length,
    resources: resources.length,
  }
  report.line('| Snapshot | Items |')
  report.line('| --- | --- |')
  for (const [k, v] of Object.entries(counts)) report.line(`| ${k} | ${v} |`)
  report.line()
  report.line(`- Child references scrubbed from committed page snapshots: ${scrubbed} blocks.`)
  report.line('- Auction items: none published on the live site.')
  return counts
}

// Removes page blocks that mention a child by display name (or first name
// on a card) or show a child's photo. Child data lives only in the
// gitignored children snapshot.
export function scrubChildren(snapshot, children) {
  const names = new Set(children.map((c) => c.displayName).filter(Boolean))
  const photos = new Set(children.map((c) => c.photo?.src).filter(Boolean))
  const mentions = (s) => typeof s === 'string' && [...names].some((n) => s.includes(n))
  let removed = 0
  const sections = snapshot.sections.map((section) => ({
    ...section,
    blocks: section.blocks.filter((b) => {
      const hit = photos.has(b.src) || mentions(b.text) || mentions(b.alt) || (b.href ?? '').startsWith('/children/')
      if (hit) removed++
      return !hit
    }),
  }))
  return { snapshot: { ...snapshot, sections }, removed }
}
