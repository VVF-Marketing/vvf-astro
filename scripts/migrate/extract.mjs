// Step 1: live site → scripts/migrate/snapshot/*.json
//
// Crawls the English URLs in the live sitemap and parses each page type
// into the snapshot shape. When Webflow API credentials are configured and
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

function writeSnapshot(name, data) {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

async function get(url) {
  if (isSpanish(url)) throw new Error(`Refusing to fetch Spanish URL ${url}`)
  return fetchText(url)
}

// Follows Webflow collection-list pagination (`?<id>_page=2`).
async function getPaginated(url, parse) {
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
  report.line('- Source for normalized snapshot: sitemap HTML scrape (English only).')

  const sitemapUrls = parseSitemap(await get(`${LIVE_BASE_URL}/sitemap.xml`))
  const enUrls = sitemapUrls.filter((u) => !isSpanish(u))
  const { pages, items } = classifyUrls(enUrls)
  // Committed (public repo): child detail URLs carry children's names, so
  // they're left out here and live only in the gitignored children snapshot.
  const paths = enUrls.map((u) => new URL(u).pathname || '/')
  writeSnapshot('sitemap', {
    urls: paths.filter((p) => !p.startsWith('/children/')),
    childUrlCount: paths.filter((p) => p.startsWith('/children/')).length,
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
  const teamIndex = parseTeamIndex(await get(`${LIVE_BASE_URL}/our-team`))
  const members = {}
  for (const { slug, url } of items.team_members) members[slug] = { url, ...parseTeamMember(await get(url)) }
  writeSnapshot('team_members', { sections: teamIndex, members })

  // Children: listing gives display order; detail pages give fields.
  const childOrder = await getPaginated(`${LIVE_BASE_URL}/sponsor-a-child-list-page`, parseChildList)
  const children = []
  for (const { slug, url } of items.children) children.push({ slug, url, ...parseChild(await get(url)) })
  writeSnapshot('children', { order: childOrder, items: children })

  // Events: listing gives card copy + past/upcoming; detail the rest.
  const eventList = parseEventList(await get(`${LIVE_BASE_URL}/all-events`))
  const events = []
  for (const { slug, url } of items.events) {
    const html = await get(url)
    events.push({ slug, url, card: eventList.find((e) => e.slug === slug), ...parseEvent(html) })
    // Event templates carry page-level sections (benefits grid, memories)
    // that aren't CMS fields; keep their outline for page recomposition.
    pageSnapshots[`events__${slug}`] = { path: new URL(url).pathname, ...parsePage(html) }
  }
  writeSnapshot('events', events)

  // Page snapshots are committed (public repo): strip every child name and
  // photo before writing them.
  let scrubbed = 0
  for (const [key, snap] of Object.entries(pageSnapshots)) {
    const result = scrubChildren(snap, children)
    scrubbed += result.removed
    writeSnapshot(`pages/${key}`, result.snapshot)
  }

  // Resources: category pages give category membership, date, excerpt.
  const categoryPages = pages.filter((p) => p.path.startsWith('/resources-categories/'))
  const cards = {}
  const categories = {}
  for (const page of categoryPages) {
    const category = page.path.split('/').pop()
    for (const card of await getPaginated(page.url, parseResourceList)) {
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
  writeSnapshot('resources', resources)

  writeSnapshot('corporate_tiers', parseCorporateTiers(await get(`${LIVE_BASE_URL}/corporate-sponsorships`)))
  // Home "Corporate Partners" CMS list (in display order).
  writeSnapshot('partners', parseSponsorLogos(load(await get(`${LIVE_BASE_URL}/`)), '.section_partners .w-dyn-items'))
  writeSnapshot('faqs', faqsByPage)

  const counts = {
    pages: pages.length,
    team_members: Object.keys(members).length,
    children: children.length,
    events: events.length,
    resources: resources.length,
  }
  report.line()
  report.line('| Snapshot | Items |')
  report.line('| --- | --- |')
  for (const [k, v] of Object.entries(counts)) report.line(`| ${k} | ${v} |`)
  report.line()
  report.line(`- Spanish URLs skipped: ${sitemapUrls.length - enUrls.length}`)
  report.line(`- Child references scrubbed from committed page snapshots: ${scrubbed} blocks.`)
  report.line('- Auction items: none published on the live site.')
  report.write()
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
