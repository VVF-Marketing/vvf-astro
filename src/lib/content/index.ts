// Content adapter: every page/component reads through the functions below,
// never through EmDash's query functions directly. Content lives in EmDash
// (schema + seed data checked in at seed/seed.json, applied to the local
// SQLite database via `npx emdash seed seed/seed.json`).
//
// Every getter takes a site locale (default `en`). A Spanish request returns
// the Spanish version of each entry where one exists and the English entry
// otherwise (marked with `fallbackLocale: 'en'`); detail getters return
// undefined only when the entry exists in neither locale. Pages never
// implement fallback themselves.
import { getEmDashCollection, getMenu, type MenuItem } from 'emdash'
import { DEFAULT_LOCALE, LOCALES, alternatePaths, type Locale } from '../i18n'
import { copyCollectionFor } from '../cmsNavigation.mjs'
import { resolveCopy, type CopyManifest, type ResolvedCopy, type SlotSpec, type StoredSlot } from '../copy'
import type {
  EventItem,
  ChildItem,
  TeamMemberItem,
  TeamTier,
  Faq,
  CampaignSettings,
  SponsorshipPackage,
  AuctionItem,
  Sponsor,
  NavItem,
  ResourceItem,
  ResourceCategory,
  ReportKind,
  Seo,
  SiteFact,
  Testimonial,
  PortableTextBlock,
} from './types'
import { RESOURCE_CATEGORY_PATHS } from './types'
import { DONORBOX_CAMPAIGNS } from '../contentModel.mjs'

// EmDash image field value. External media carries `src`; local media
// (uploaded through the admin or the migration importer) carries only its
// storage key, served by EmDash's media file route.
interface EmDashImage {
  src?: string
  alt?: string
  provider?: string
  meta?: { storageKey?: string }
}

const MEDIA_FILE_BASE_URL = '/_emdash/api/media/file'

// EmDash defaults getEmDashCollection() to 50 results; every collection here
// is small (dozens of rows), but pass an explicit ceiling so a future growth
// in content doesn't silently truncate a list.
const LIST_LIMIT = 100

function resolveImage(image: EmDashImage | undefined | null): string | undefined {
  if (!image) return undefined
  if (image.src) return image.src
  const storageKey = image.meta?.storageKey
  return storageKey ? `${MEDIA_FILE_BASE_URL}/${storageKey}` : undefined
}

// --- Locale resolution ---------------------------------------------------

type QueryFilter = NonNullable<Parameters<typeof getEmDashCollection>[1]>

interface RawEntry {
  id?: string
  slug?: string
  data: Record<string, any>
}

// An entry resolved for a requested locale. `enSlug` is the English
// counterpart's slug when a translation was found, so /es/<english-slug>
// still finds the Spanish entry. `slugs` and `variants` hold the entry's
// slug and data in every locale it exists in (when queried `withSlugs`, or
// for Spanish requests).
interface LocalizedEntry {
  slug: string
  data: Record<string, any>
  fallbackLocale?: Locale
  enSlug?: string
  slugs: Partial<Record<Locale, string>>
  variants: Partial<Record<Locale, Record<string, any>>>
}

// Translations of one entry share a translation group; rows created before
// i18n have none and are their own group.
function groupOf(e: RawEntry): string {
  return String(e.data.translationGroup ?? e.data.id ?? e.slug ?? '')
}

async function queryLocale(collection: string, filter: QueryFilter, locale: Locale): Promise<RawEntry[]> {
  // Always pass the locale explicitly: on /es pages EmDash's request context
  // would otherwise scope the query to `es` on its own.
  const { entries, error } = await getEmDashCollection(collection, { ...filter, locale } as QueryFilter)
  // EmDash returns query failures instead of throwing them. Throw, so a
  // database outage is a logged 500 rather than a page silently missing its
  // content. A collection without a table yet isn't a failure: EmDash
  // returns no entries.
  if (error) throw error
  return entries as unknown as RawEntry[]
}

const OTHER_LOCALE: Record<Locale, Locale> = { en: 'es', es: 'en' }

// English entries, in query order, each swapped for its translation in
// `locale` when one exists.
// English lists skip the Spanish query unless `withSlugs` (detail pages need
// to know whether a translation exists).
async function listEntries(
  collection: string,
  filter: QueryFilter,
  locale: Locale,
  { withSlugs = false } = {}
): Promise<LocalizedEntry[]> {
  if (locale === DEFAULT_LOCALE && !withSlugs) {
    return (await queryLocale(collection, filter, locale)).map((e) => ({
      slug: e.slug ?? '',
      data: e.data,
      slugs: { en: e.slug ?? '' },
      variants: { en: e.data },
    }))
  }
  const other = OTHER_LOCALE[DEFAULT_LOCALE]
  const [base, translated] = await Promise.all([
    queryLocale(collection, filter, DEFAULT_LOCALE),
    queryLocale(collection, filter, other),
  ])
  const byGroup = new Map(translated.map((e) => [groupOf(e), e]))
  const resolved = base.map((e): LocalizedEntry => {
    const t = byGroup.get(groupOf(e))
    byGroup.delete(groupOf(e))
    const slugs = { en: e.slug ?? '', ...(t ? { [other]: t.slug ?? '' } : {}) }
    const variants = { en: e.data, ...(t ? { [other]: t.data } : {}) }
    if (locale === DEFAULT_LOCALE) return { slug: e.slug ?? '', data: e.data, slugs, variants }
    if (!t) return { slug: e.slug ?? '', data: e.data, fallbackLocale: DEFAULT_LOCALE, slugs, variants }
    return { slug: t.slug ?? '', data: t.data, enSlug: e.slug, slugs, variants }
  })
  // A translation is shown only while its English entry is live: unpublishing
  // (or hiding, e.g. a child profile's `published` flag) the English entry
  // takes every locale down with it. Translations left in `byGroup` have no
  // live English entry and are dropped.
  return resolved
}

function matchesSlug(e: LocalizedEntry, slug: string): boolean {
  return e.slug === slug || e.enSlug === slug
}

function withFallback<T extends object>(item: T, e: LocalizedEntry): T {
  return e.fallbackLocale ? { ...item, fallbackLocale: e.fallbackLocale } : item
}

function withAlternates<T extends object>(item: T, e: LocalizedEntry): T {
  return { ...item, alternates: e.slugs }
}

function toSeo(d: Record<string, any>): Seo | undefined {
  const seo = { title: d.seo_title, description: d.seo_description, imageUrl: resolveImage(d.social_image) }
  return seo.title || seo.description || seo.imageUrl ? seo : undefined
}

// Reference fields hold entry ids (ids are unique across locales); each
// referenced entry is shown in `locale` when it has a translation. The
// referenced collection is read with one list query (EmDash caches it for the
// rest of the request) rather than one query per reference.
async function resolveRefs<T>(
  collection: string,
  ids: unknown,
  map: (data: Record<string, any>) => T,
  locale: Locale = DEFAULT_LOCALE
): Promise<T[] | undefined> {
  if (!Array.isArray(ids) || ids.length === 0) return undefined
  const byId = new Map<string, RawEntry>()
  for (const e of await queryLocale(collection, { limit: LIST_LIMIT }, DEFAULT_LOCALE)) {
    for (const key of [e.id, e.data.id]) if (key != null) byId.set(String(key), e)
  }
  const found = ids.flatMap((id) => byId.get(String(id)) ?? [])
  if (locale === DEFAULT_LOCALE) return found.map((e) => map(e.data))
  const translated = new Map(
    (await queryLocale(collection, { limit: LIST_LIMIT }, locale)).map((e) => [groupOf(e), e.data])
  )
  return found.map((e) => map(translated.get(groupOf(e)) ?? e.data))
}

// Referenced entries with their ids (benefit grid cells are keyed by offer id).
async function resolveRefEntries(collection: string, ids: unknown, locale: Locale): Promise<{ id: string; data: Record<string, any> }[]> {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const byId = new Map<string, RawEntry>()
  for (const e of await queryLocale(collection, { limit: LIST_LIMIT }, DEFAULT_LOCALE)) {
    for (const key of [e.id, e.data.id]) if (key != null) byId.set(String(key), e)
  }
  const found = ids.flatMap((id) => byId.get(String(id)) ?? [])
  const translated =
    locale === DEFAULT_LOCALE ? new Map() : new Map((await queryLocale(collection, { limit: LIST_LIMIT }, locale)).map((e) => [groupOf(e), e.data]))
  // data.id is the database id (entry.id is the slug for routable rows).
  return found.map((e) => ({ id: String(e.data.id ?? e.id), data: translated.get(groupOf(e)) ?? e.data }))
}

// Portable Text → plain paragraphs (for components that take text).
function ptText(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (!Array.isArray(value)) return undefined
  const text = (value as PortableTextBlock[])
    .filter((b) => b._type === 'block')
    .map((b) => ((b.children as { text?: string }[] | undefined) ?? []).map((c) => c.text ?? '').join(''))
    .filter(Boolean)
    .join('\n\n')
  return text || undefined
}

const ptLines = (value: unknown) => (ptText(value) ?? '').split(/\n{2,}/).filter(Boolean)

// Event offer (spec `event_offer`) as the package/ticket shape pages use.
const OFFER_KIND: Record<string, SponsorshipPackage['kind']> = { ticket: 'ticket', package: 'package', special_opportunity: 'special' }
function toOffer(d: Record<string, any>): SponsorshipPackage {
  return {
    tierName: d.name,
    price: d.price,
    benefits: ptLines(d.includes),
    kind: OFFER_KIND[d.kind] ?? 'package',
    shortName: d.short_name || undefined,
    ctaLabel: d.button_label || undefined,
    ctaUrl: d.button_link || undefined,
    soldOut: Boolean(d.sold_out),
    order: d.sort_order,
  }
}

// Corporate Sponsorships tiers (page content in the spec, 7.6).
function toTier(d: Record<string, any>): SponsorshipPackage {
  return {
    tierName: d.tier_name,
    price: d.price,
    recognitionBenefits: d.recognition_benefits ?? undefined,
    activityBenefits: d.activity_benefits ?? undefined,
    promotionalBenefits: d.promotional_benefits ?? undefined,
    order: d.order,
  }
}

function toAuctionItem(d: Record<string, any>): AuctionItem {
  return {
    name: d.name,
    imageUrl: resolveImage(d.photo),
    estimatedValue: d.value,
  }
}

function toSponsor(d: Record<string, any>): Sponsor {
  return {
    name: d.name,
    logoUrl: resolveImage(d.logo),
    website: d.website_url || undefined,
  }
}

function toFaq(d: Record<string, any>): Faq {
  return { question: d.question, answer: ptText(d.answer) ?? '', category: 'general', order: d.sort_order }
}

// --- Events -----------------------------------------------------------

// Program rows as list blocks with the time in bold (ProgramTimeline reads
// them with listItemsWithLead).
function programBlocks(rows: { time?: string; text?: string }[] | undefined): PortableTextBlock[] | undefined {
  if (!rows?.length) return undefined
  return rows.map((r, i) => ({
    _type: 'block',
    _key: `p${i}`,
    listItem: 'bullet',
    children: [...(r.time ? [{ _type: 'span', text: r.time, marks: ['strong'] }] : []), { _type: 'span', text: r.text ?? '', marks: [] }],
  }))
}

async function editionsOf(ids: unknown, locale: Locale) {
  const editions = await resolveRefEntries('events', Array.isArray(ids) ? ids : ids ? [ids] : [], locale)
  const slugs = new Map((await queryLocale('events', { limit: LIST_LIMIT }, DEFAULT_LOCALE)).map((e) => [String(e.data.id ?? e.id), e.slug ?? '']))
  return editions.map((e) => ({ slug: slugs.get(e.id) ?? '', title: e.data.name, startDate: e.data.start }))
}

// The flags photo stands in for an event with no hero photo (spec 4.4, `event`).
export const EVENT_FALLBACK_PHOTO = '/images/pages/82499f8c-vvf-golf2026-flagphoto-waystogive-v1.webp'

async function toEvent(e: LocalizedEntry, locale: Locale): Promise<EventItem> {
  const d = e.data
  const offers = await resolveRefEntries('event_offers', d.offers, locale)
  const packages = offers.filter((o) => o.data.kind === 'package').sort((a, b) => (a.data.sort_order ?? 0) - (b.data.sort_order ?? 0))
  const rows = (await resolveRefEntries('benefit_rows', d.benefit_rows, locale)).sort((a, b) => (a.data.sort_order ?? 0) - (b.data.sort_order ?? 0))
  const cells = (row: Record<string, any>) => packages.map((p) => drop(row.values?.[p.id] ?? {}))
  const past = d.lifecycle === 'past'
  const address = d.venue_address as string | undefined
  const registrationUrl = d.registration_url as string | undefined
  const [previous, next] = await Promise.all([editionsOf(d.previous_editions, locale), editionsOf(d.next_edition, locale)])
  return withFallback(
    {
      slug: e.slug,
      title: d.name,
      startDate: d.start,
      endDate: d.end || undefined,
      lifecycle: d.lifecycle ?? 'upcoming',
      registration: d.registration ?? 'open',
      featured: Boolean(d.featured),
      summary: d.summary,
      location: [d.city, d.state].filter(Boolean).join(', '),
      city: d.city || undefined,
      state: d.state || undefined,
      description: d.summary,
      imageUrl: resolveImage(d.hero_photo) ?? EVENT_FALLBACK_PHOTO,
      registrationUrl,
      // Donorbox Events id, for the ticket links (spec 8.1: from registration_url).
      donorboxEventId: registrationUrl?.match(/donorbox\.org\/events\/(\d+)/)?.[1],
      ticketsFrom: d.tickets_from ?? undefined,
      sponsorPackages: offers.map((o) => toOffer(o.data)),
      auctionItems: (await resolveRefs('auction_items', d.auction_items, toAuctionItem, locale)) ?? undefined,
      sponsors: await resolveRefs('partners', d.sponsors, toSponsor, locale),
      faqs: await resolveRefs('faqs', d.faqs, toFaq, locale),
      // The page heading is the event's name; a recap leads with its headline.
      heroHeading: past ? d.recap_headline || d.name : d.name,
      heroBody: past ? d.recap_summary || d.summary : d.summary,
      heroImageUrl: resolveImage(d.hero_photo) ?? EVENT_FALLBACK_PHOTO,
      heroImageMobileUrl: resolveImage(d.hero_photo_phone),
      venue: d.venue_name || undefined,
      address,
      mapUrl: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined,
      program: programBlocks(d.program),
      includes: d.whats_included ?? undefined,
      gallery: Array.isArray(d.gallery)
        ? d.gallery.flatMap((g: EmDashImage) => {
            const url = resolveImage(g)
            return url ? [{ url, alt: g.alt }] : []
          })
        : undefined,
      amountRaised: d.amount_raised || undefined,
      stats: d.stats?.length ? d.stats : undefined,
      recapStats: d.stats?.length ? d.stats.map((s: { value: string; label?: string }) => ({ number: s.value, heading: s.label })) : undefined,
      recapVideo: d.recap_video || undefined,
      previousEditions: previous.length ? previous : undefined,
      nextEdition: next[0],
      benefitRows: rows.length
        ? rows.map((r) => ({
            section: r.data.section,
            name: r.data.name,
            values: cells(r.data).map((c: { check?: boolean; text?: string }) => (c.check ? 'Yes' : (c.text ?? ''))),
          }))
        : undefined,
      benefitGrid: packages.length
        ? { columns: packages.map((p) => p.data.name), rows: rows.map((r) => ({ section: r.data.section, name: r.data.name, cells: cells(r.data) })) }
        : undefined,
      appeal: d.appeal_heading
        ? {
            heading: d.appeal_heading,
            text: d.appeal_text || undefined,
            imageUrl: resolveImage(d.appeal_image),
            imageAlt: d.appeal_image_alt || d.appeal_image?.alt,
            caption: d.appeal_caption || undefined,
            cardsLabel: d.appeal_cards_label || undefined,
            cards: (d.appeal_cards ?? []).map((c: Record<string, string>) => ({
              title: c.title,
              text: c.text,
              imageUrl: c.image_url || undefined,
              imageAlt: c.image_alt || undefined,
            })),
            cta: d.appeal_cta_label && d.appeal_cta_url ? { label: d.appeal_cta_label, href: d.appeal_cta_url } : undefined,
          }
        : undefined,
      contact: d.contact_phone || d.contact_email ? { phone: d.contact_phone || undefined, email: d.contact_email || undefined } : undefined,
      // Spec 7.8: description from meta_description (none when empty); share
      // image falls back to the hero photo (4.5-8).
      seo: { description: d.meta_description || undefined, imageUrl: resolveImage(d.share_image) ?? resolveImage(d.hero_photo) },
    } satisfies EventItem,
    e
  )
}

function drop<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T
}

export async function getEvents(locale: Locale = DEFAULT_LOCALE): Promise<EventItem[]> {
  const entries = await listEntries('events', { limit: LIST_LIMIT, orderBy: { start: 'asc' } }, locale)
  return Promise.all(entries.map((e) => toEvent(e, locale)))
}

export async function getEventBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<EventItem | undefined> {
  const e = (await listEntries('events', { limit: LIST_LIMIT }, locale, { withSlugs: true })).find((x) => matchesSlug(x, slug))
  return e ? withAlternates(await toEvent(e, locale), e) : undefined
}

// Lists place events by start date and never show a cancelled event as
// upcoming (spec 4.3, `lifecycle`).
// Home's fallback when no featured event is upcoming (spec 7.1, section 6).
export function latestPast<T extends Pick<EventItem, 'startDate' | 'lifecycle'>>(events: T[]): T | undefined {
  return events
    .filter((e) => e.lifecycle !== 'cancelled' && new Date(e.startDate).getTime() < Date.now())
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
}

export function isUpcoming(event: Pick<EventItem, 'startDate'> & { lifecycle?: EventItem['lifecycle'] }): boolean {
  return event.lifecycle !== 'cancelled' && new Date(event.startDate).getTime() >= Date.now()
}

// --- Children -----------------------------------------------------------

const CHILDREN_ALL: QueryFilter = { limit: LIST_LIMIT }
// Only available children are listed (spec 4.5-4); every profile stays live.
const CHILDREN_AVAILABLE: QueryFilter = { where: { sponsorship_status: 'available' }, limit: LIST_LIMIT }

function toChild(e: LocalizedEntry): ChildItem {
  const d = e.data
  const status = (d.sponsorship_status ?? 'available') as ChildItem['sponsorshipStatus']
  return withFallback(
    {
      slug: e.slug,
      displayName: d.name,
      age: d.age,
      birthday: d.birth_date || undefined,
      gender: d.gender === 'male' ? 'Male' : d.gender === 'female' ? 'Female' : undefined,
      dream: d.dream || undefined,
      about: ptText(d.story),
      imageUrl: resolveImage(d.photo),
      imageAlt: d.photo?.alt,
      published: status === 'available',
      sponsorshipStatus: status,
      donorboxSponsorshipRef: d.donorbox_sponsorship_ref,
    } satisfies ChildItem,
    e
  )
}

export async function getChildren(locale: Locale = DEFAULT_LOCALE): Promise<ChildItem[]> {
  // Filtered in the query and again here, so a child is never listed by
  // mistake if a store ignores the filter.
  return (await listEntries('children', CHILDREN_AVAILABLE, locale)).filter((e) => (e.data.sponsorship_status ?? 'available') === 'available').map(toChild)
}

export async function getChildBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<ChildItem | undefined> {
  const e = (await listEntries('children', CHILDREN_ALL, locale, { withSlugs: true })).find((x) => matchesSlug(x, slug))
  return e ? withAlternates(toChild(e), e) : undefined
}

// --- Team -----------------------------------------------------------

// Spec groups (board, leadership, staff) and the site's tier names.
const GROUP_TIER: Record<string, TeamTier> = { board: 'board', leadership: 'leader', staff: 'staff' }
const TIER_GROUP: Record<TeamTier, string> = { board: 'board', leader: 'leadership', staff: 'staff' }

function toTeamMember(e: LocalizedEntry, tier?: TeamTier): TeamMemberItem {
  const d = e.data
  const groups = ((d.groups as string[] | undefined) ?? []).map((g) => GROUP_TIER[g]).filter(Boolean)
  const shownAs = tier ?? groups[0] ?? 'staff'
  return withFallback(
    {
      slug: e.slug,
      name: d.name,
      // The role shown depends on the section the card sits in.
      role: (shownAs === 'board' ? d.board_position : shownAs === 'leader' ? d.leadership_role : d.title) || d.title || d.board_position || '',
      tier: shownAs,
      groups,
      boardPosition: d.board_position || undefined,
      title: d.title || undefined,
      openSeat: Boolean(d.open_seat) || undefined,
      imageUrl: resolveImage(d.photo),
      bio: d.bio_summary || undefined,
      longBio: ptText(d.bio),
      quote: d.quote || undefined,
      since: d.since || undefined,
      from: d.from || undefined,
      basedIn: d.based_in || undefined,
      background: d.background?.length ? d.background.map((b: { label: string; detail: string }) => ({ label: b.label, value: b.detail })) : undefined,
      linkedin: d.linkedin || undefined,
      socialLinks: d.linkedin ? [{ platform: 'linkedin', url: d.linkedin }] : undefined,
      profileSlug: d.open_seat ? undefined : e.slug,
      order: d.display_order,
    } satisfies TeamMemberItem,
    e
  )
}

// A person in several groups is one record (spec 4.5-5); multiSelect fields
// can't be queried, so the group filter runs here.
export async function getTeamMembers(tier?: TeamTier, locale: Locale = DEFAULT_LOCALE): Promise<TeamMemberItem[]> {
  const entries = await listEntries('team_members', { limit: LIST_LIMIT, orderBy: { display_order: 'asc' } }, locale)
  return entries
    .filter((e) => !e.data.open_seat && (!tier || ((e.data.groups as string[] | undefined) ?? []).includes(TIER_GROUP[tier])))
    .map((e) => toTeamMember(e, tier))
}

// Open board seats: one invitation tile on Our Team covers them all (spec 7.9).
export async function getOpenSeats(locale: Locale = DEFAULT_LOCALE): Promise<TeamMemberItem[]> {
  const entries = await listEntries('team_members', { limit: LIST_LIMIT, orderBy: { display_order: 'asc' } }, locale)
  return entries.filter((e) => e.data.open_seat).map((e) => toTeamMember(e, 'board'))
}

export async function getTeamMemberBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<TeamMemberItem | undefined> {
  const e = (await listEntries('team_members', { limit: LIST_LIMIT }, locale, { withSlugs: true })).find((x) => matchesSlug(x, slug) && !x.data.open_seat)
  return e ? withAlternates(toTeamMember(e), e) : undefined
}

// --- Articles (Resources) -----------------------------------------------------------

const ARTICLES_FILTER: QueryFilter = { limit: LIST_LIMIT, orderBy: { publish_date: 'desc' } }

// Category slugs (spec `category`) and the site's category keys.
const CATEGORY_KEY: Record<string, string> = { stories: 'stories', financials: 'financials-transparency', news: 'news' }

// Category entry id → its key, read once per request (EmDash caches the query).
async function categoryKeys(): Promise<Map<string, ResourceCategory>> {
  const rows = await queryLocale('categories', { limit: LIST_LIMIT }, DEFAULT_LOCALE)
  return new Map(rows.map((r) => [String(r.data.id ?? r.id), (CATEGORY_KEY[r.slug ?? ''] ?? r.slug) as ResourceCategory]))
}

async function toResource(e: LocalizedEntry, keys: Map<string, ResourceCategory>, locale: Locale): Promise<ResourceItem> {
  const d = e.data
  const category = keys.get(String(d.category))
  const authors = await resolveRefs('authors', d.authors, (a) => ({ name: a.name as string, role: (a.role as string) || undefined }), locale)
  return withFallback(
    {
      slug: e.slug,
      title: d.title,
      categories: category ? [category] : [],
      reportKind: d.report_type || undefined,
      publishedAt: d.publish_date,
      updatedAt: d.last_updated || undefined,
      authors,
      excerpt: d.excerpt,
      imageUrl: resolveImage(d.featured_image),
      imageAlt: d.featured_image?.alt,
      body: d.body ?? undefined,
      fileUrl: resolveImage(d.report_pdf),
      featured: Boolean(d.featured),
      external: Boolean(d.external) || undefined,
      externalUrl: d.external_url || undefined,
      outlet: d.outlet || undefined,
      languageTag: d.language_tag || undefined,
      // Spec 4.5-7: empty SEO fields fall back to title, excerpt and featured image.
      seo: {
        title: d.seo_title || d.title,
        description: d.meta_description || d.excerpt || undefined,
        imageUrl: resolveImage(d.social_image) ?? resolveImage(d.featured_image),
      },
    } satisfies ResourceItem,
    e
  )
}

// Newest first.
export async function getResources(category?: ResourceCategory, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem[]> {
  const keys = await categoryKeys()
  const all = await Promise.all((await listEntries('articles', ARTICLES_FILTER, locale)).map((e) => toResource(e, keys, locale)))
  return category ? all.filter((r) => r.categories.includes(category)) : all
}

// A category's name and description in the page's language (spec 7.12:
// category pages take their heading, title and description from it).
export async function getCategory(category: ResourceCategory, locale: Locale = DEFAULT_LOCALE): Promise<{ name: string; description?: string } | undefined> {
  const path = RESOURCE_CATEGORY_PATHS[category]
  const e = (await listEntries('categories', { limit: LIST_LIMIT }, locale, { withSlugs: true })).find((x) => matchesSlug(x, path))
  return e ? { name: e.data.name, description: e.data.description || undefined } : undefined
}

// News, its menu item, filter button, footer link and sitemap entry exist
// only while a News article is published (spec 3.1).
export async function hasNews(locale: Locale = DEFAULT_LOCALE): Promise<boolean> {
  return (await getResources('news', locale)).length > 0
}

const NEWS_PATH = /^(\/es)?\/resources\/news\/?$/

export function getResourcesByCategory(category: ResourceCategory, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem[]> {
  return getResources(category, locale)
}

// An article page; external articles have none (spec 7.13).
export async function getResource(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem | undefined> {
  const e = (await listEntries('articles', ARTICLES_FILTER, locale, { withSlugs: true })).find((x) => matchesSlug(x, slug) && !x.data.external)
  return e ? withAlternates(await toResource(e, await categoryKeys(), locale), e) : undefined
}

export const getArticle = getResource

// Annual or quarterly financial reports (Financials & Transparency), newest first.
export async function getReports(kind: ReportKind, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem[]> {
  return (await getResources('financials-transparency', locale)).filter((r) => r.reportKind === kind)
}

// --- Testimonials -----------------------------------------------------------

export async function getTestimonials(locale: Locale = DEFAULT_LOCALE): Promise<Testimonial[]> {
  const entries = await listEntries('testimonials', { limit: LIST_LIMIT }, locale)
  return entries.map((e) => ({
    quote: ptText(e.data.quote) ?? '',
    name: e.data.name,
    role: e.data.role || undefined,
    imageUrl: resolveImage(e.data.photo),
  }))
}

// --- Partners, sponsorship tiers -----------------------------

export async function getSponsors(locale: Locale = DEFAULT_LOCALE): Promise<Sponsor[]> {
  return (await listEntries('partners', { limit: LIST_LIMIT, orderBy: { display_order: 'asc' } }, locale)).map((e) => toSponsor(e.data))
}

// The general logo strips (Home, Corporate Sponsorships): active partners, in
// display order (spec 7.1, section 7). Booleans are stored as 0/1 integers;
// filter with 1 so the query works on Postgres as well as SQLite.
export async function getPartners(locale: Locale = DEFAULT_LOCALE): Promise<Sponsor[]> {
  const filter: QueryFilter = { where: { active: 1 as unknown as string }, orderBy: { display_order: 'asc' }, limit: LIST_LIMIT }
  return (await listEntries('partners', filter, locale)).map((e) => toSponsor(e.data))
}

// Corporate Sponsorships tiers.
export async function getSponsorshipPackages(locale: Locale = DEFAULT_LOCALE): Promise<SponsorshipPackage[]> {
  return (await listEntries('corporate_tiers', { orderBy: { order: 'asc' }, limit: LIST_LIMIT }, locale)).map((e) => toTier(e.data))
}

// --- FAQs -----------------------------------------------------------

// Static pages list every question ticked for them (spec 4.3 `faq`); event
// pages read their own picks (EventItem.faqs).
const FAQ_PAGE: Partial<Record<Faq['category'], string>> = { sponsorship: 'sponsor_a_child', donation: 'ways_to_give' }

export async function getFaqs(category?: Faq['category'], locale: Locale = DEFAULT_LOCALE): Promise<Faq[]> {
  const page = category ? FAQ_PAGE[category] : undefined
  const entries = await listEntries('faqs', { limit: LIST_LIMIT, orderBy: { sort_order: 'asc' } }, locale)
  return entries
    .filter((e) => !category || ((e.data.shows_on as string[] | undefined) ?? []).includes(page ?? ''))
    .map((e) => ({ ...toFaq(e.data), category: category ?? 'general' }))
}

// --- Site facts -----------------------------------------------------------

// Approved impact figures by key (spec 4.3 `site_fact`): an unapproved one is
// shown nowhere.
export async function getSiteFacts(locale: Locale = DEFAULT_LOCALE): Promise<Partial<Record<SiteFact['key'], SiteFact>>> {
  const entries = await listEntries('site_facts', { limit: LIST_LIMIT }, locale)
  return Object.fromEntries(
    entries
      .filter((e) => e.data.approved)
      .map((e) => [e.data.key, { key: e.data.key, value: e.data.value, label: e.data.label, detail: e.data.detail || undefined, period: e.data.period }])
  )
}

// --- Donorbox campaigns ----------------------------------------------------

// The three campaign IDs, stored once (spec 8.1, rule 1); today's IDs when
// the entry is missing or a field is empty.
export async function getDonorboxCampaigns(): Promise<{ general: string; earthquake: string; sponsorship: string }> {
  const d = (await listEntries('donorbox_settings', { limit: 1 }, DEFAULT_LOCALE))[0]?.data ?? {}
  return {
    general: d.general_donation?.trim() || DONORBOX_CAMPAIGNS.general,
    earthquake: d.earthquake_relief?.trim() || DONORBOX_CAMPAIGNS.earthquake,
    sponsorship: d.child_sponsorship?.trim() || DONORBOX_CAMPAIGNS.sponsorship,
  }
}

// --- Site banner -----------------------------------------------------------

export async function getCampaignSettings(locale: Locale = DEFAULT_LOCALE): Promise<CampaignSettings> {
  const d = (await listEntries('campaign_settings', { limit: 1 }, locale))[0]?.data
  if (!d) return { active: false }
  return {
    active: d.active ?? false,
    bannerText: d.banner_text,
    donorboxCampaignId: d.donorbox_campaign_id,
  }
}

// --- Page copy -----------------------------------------------------------

// A page's slots live in its own copy collection (src/lib/cmsNavigation.mjs);
// until that collection exists (schema not applied yet) the query returns no
// rows and the page renders its defaults.
async function storedSlots(route: string, locale: Locale): Promise<Map<string, StoredSlot>> {
  const rows = await queryLocale(copyCollectionFor(route), { limit: 500 }, locale)
  return new Map(
    rows.map((r) => [
      String(r.data.key),
      { value: r.data.value, richValue: r.data.rich_value, imageUrl: resolveImage(r.data.image_value) } satisfies StoredSlot,
    ])
  )
}

// A page's declared copy slots in `locale` (each falling back to English,
// then to its default from code), plus the locales the page exists in for
// hreflang and the sitemap: English always, another locale once its SEO
// title is translated. Pages are partly translated by design (names, emails
// and numbers stay as they are), so a translated SEO title — what search
// results show — is the signal that someone translated the page.
const SEO_TITLE_KEY = 'seo.title'

export async function getPageCopy<S extends Record<string, SlotSpec>>(
  manifest: CopyManifest<S>,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ copy: ResolvedCopy<S>; locales: Locale[] }> {
  const byLocale = new Map(await Promise.all(LOCALES.map(async (l) => [l, await storedSlots(manifest.route, l)] as const)))
  const english = byLocale.get(DEFAULT_LOCALE)!
  const copy = resolveCopy(manifest, { requested: byLocale.get(locale) ?? english, english })
  const hasOwnSeoTitle = (slots: Map<string, StoredSlot>) => Boolean(slots.get(SEO_TITLE_KEY)?.value?.trim())
  const locales = LOCALES.filter((l) => l === DEFAULT_LOCALE || hasOwnSeoTitle(byLocale.get(l)!))
  return { copy, locales }
}

// --- Navigation -----------------------------------------------------------

function toNavItem(item: MenuItem): NavItem {
  return {
    label: item.label,
    url: item.url,
    children: item.children.length > 0 ? item.children.map(toNavItem) : undefined,
  }
}

// EmDash resolves menu translations itself (falling back es -> en).
export async function getPrimaryMenu(locale: Locale = DEFAULT_LOCALE): Promise<NavItem[]> {
  const menu = await getMenu('primary', { locale })
  if (!menu) return []
  const items = menu.items.map(toNavItem)
  // The News item shows only while News has an article (spec 3.1); the
  // articles are only looked up when the menu has that item.
  const linksNews = (list: NavItem[]): boolean => list.some((i) => NEWS_PATH.test(i.url) || linksNews(i.children ?? []))
  if (!linksNews(items) || (await hasNews(locale))) return items
  const withoutNews = (list: NavItem[]): NavItem[] => list.filter((i) => !NEWS_PATH.test(i.url)).map((i) => (i.children ? { ...i, children: withoutNews(i.children) } : i))
  return withoutNews(items)
}

// --- Sitemap ------------------------------------------------------------------

// Per-locale paths of every CMS detail page, using the same queries as the
// detail pages themselves (src/lib/sitemap.ts). Child profiles are left out
// on purpose.
export async function getSitemapDetailPages(): Promise<Partial<Record<Locale, string>>[]> {
  const paths = (base: string, slugs: Partial<Record<Locale, string>>) =>
    alternatePaths(base, Object.fromEntries(Object.entries(slugs).filter(([, s]) => s))) ?? {}
  const [events, articles, team, children] = await Promise.all([
    listEntries('events', { limit: LIST_LIMIT }, DEFAULT_LOCALE, { withSlugs: true }),
    listEntries('articles', ARTICLES_FILTER, DEFAULT_LOCALE, { withSlugs: true }),
    listEntries('team_members', { limit: LIST_LIMIT }, DEFAULT_LOCALE, { withSlugs: true }),
    listEntries('children', CHILDREN_ALL, DEFAULT_LOCALE, { withSlugs: true }),
  ])
  return [
    ...events.map((e) => paths('/events', e.slugs)),
    // External articles have no page (spec 7.13).
    ...articles.filter((e) => !e.data.external).map((e) => paths('/resources', e.slugs)),
    // Open seats have no bio page (spec 7.10).
    ...team.filter((e) => !e.data.open_seat).map((e) => paths('/our-team', e.slugs)),
    // Every child profile is public and open to search engines (spec 2.4, Q1).
    ...children.map((e) => paths('/children', e.slugs)),
  ].filter((p) => Object.keys(p).length > 0)
}
