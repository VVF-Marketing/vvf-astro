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
import { DEFAULT_LOCALE, type Locale } from '../i18n'
import type {
  EventItem,
  ChildItem,
  TeamMemberItem,
  TeamTier,
  PostItem,
  Faq,
  CampaignUpdate,
  CampaignSettings,
  SponsorshipPackage,
  AuctionItem,
  Sponsor,
  NavItem,
  ResourceItem,
  ResourceCategory,
  Seo,
} from './types'

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
  const { entries } = await getEmDashCollection(collection, { ...filter, locale } as QueryFilter)
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

function toSponsorshipPackage(d: Record<string, any>): SponsorshipPackage {
  return {
    tierName: d.tier_name,
    price: d.price,
    recognitionBenefits: d.recognition_benefits ?? undefined,
    activityBenefits: d.activity_benefits ?? undefined,
    promotionalBenefits: d.promotional_benefits ?? undefined,
    benefits: d.benefits ?? undefined,
    kind: d.kind ?? undefined,
    shortName: d.short_name ?? undefined,
    ctaLabel: d.cta_label ?? undefined,
    ctaUrl: d.cta_url ?? undefined,
    soldOut: d.sold_out ?? false,
    order: d.order,
  }
}

function toAuctionItem(d: Record<string, any>): AuctionItem {
  return {
    name: d.name,
    imageUrl: resolveImage(d.image),
    estimatedValue: d.estimated_value,
    bidUrl: d.bid_url,
  }
}

function toSponsor(d: Record<string, any>): Sponsor {
  return {
    name: d.name,
    logoUrl: resolveImage(d.logo),
    website: d.website,
  }
}

// --- Events -----------------------------------------------------------

async function toEvent(e: LocalizedEntry, locale: Locale): Promise<EventItem> {
  const d = e.data
  return withFallback(
    {
      slug: e.slug,
      title: d.title,
      startDate: d.start_date,
      location: d.location,
      description: d.description,
      imageUrl: resolveImage(d.image),
      category: d.category,
      donorboxEventId: d.donorbox_event_id,
      sponsorPackages: await resolveRefs('sponsorship_packages', d.sponsor_packages, toSponsorshipPackage, locale),
      auctionItems: await resolveRefs('auction_items', d.auction_items, toAuctionItem, locale),
      sponsors: await resolveRefs('sponsors', d.sponsors, toSponsor, locale),
      heroHeading: d.hero_heading,
      heroBody: d.hero_body,
      heroImageUrl: resolveImage(d.hero_image),
      heroImageMobileUrl: resolveImage(d.hero_image_mobile),
      venue: d.venue,
      address: d.address,
      mapUrl: d.map_url,
      program: d.program ?? undefined,
      includes: d.includes ?? undefined,
      gallery: Array.isArray(d.gallery)
        ? d.gallery.flatMap((g: EmDashImage) => {
            const url = resolveImage(g)
            return url ? [{ url, alt: g.alt }] : []
          })
        : undefined,
      recapStats: d.recap_stats ?? undefined,
      benefitRows: d.benefit_rows ?? undefined,
      seo: toSeo(d),
    } satisfies EventItem,
    e
  )
}

export async function getEvents(locale: Locale = DEFAULT_LOCALE): Promise<EventItem[]> {
  const entries = await listEntries('events', { limit: LIST_LIMIT }, locale)
  return Promise.all(entries.map((e) => toEvent(e, locale)))
}

export async function getEventBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<EventItem | undefined> {
  const e = (await listEntries('events', { limit: LIST_LIMIT }, locale, { withSlugs: true })).find((x) =>
    matchesSlug(x, slug)
  )
  return e ? withAlternates(await toEvent(e, locale), e) : undefined
}

export function isUpcoming(event: Pick<EventItem, 'startDate'>): boolean {
  return new Date(event.startDate).getTime() >= Date.now()
}

// --- Children -----------------------------------------------------------

const CHILDREN_FILTER: QueryFilter = { where: { published: true }, orderBy: { order: 'asc' }, limit: LIST_LIMIT }

function toChild(e: LocalizedEntry): ChildItem {
  const d = e.data
  return withFallback(
    {
      slug: e.slug,
      displayName: d.display_name,
      age: d.age,
      birthday: d.birthday,
      gender: d.gender,
      dream: d.dream,
      about: d.about,
      imageUrl: resolveImage(d.photo),
      imageAlt: d.photo?.alt,
      published: d.published ?? false,
      donorboxSponsorshipRef: d.donorbox_sponsorship_ref,
      order: d.order,
    } satisfies ChildItem,
    e
  )
}

export async function getChildren(locale: Locale = DEFAULT_LOCALE): Promise<ChildItem[]> {
  return (await listEntries('children', CHILDREN_FILTER, locale)).map(toChild)
}

export async function getChildBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<ChildItem | undefined> {
  const e = (await listEntries('children', CHILDREN_FILTER, locale, { withSlugs: true })).find((x) => matchesSlug(x, slug))
  return e ? withAlternates(toChild(e), e) : undefined
}

// --- Team -----------------------------------------------------------

// Profile pages are keyed by `profile_slug`, which can differ per locale; each
// member carries it for every locale so /es/our-team/<english slug> still
// finds a translated profile, and the page can link its other-locale URL.
type TeamMemberWithAlt = TeamMemberItem & { profileSlugs: Partial<Record<Locale, string>> }

async function listTeamMembers(
  tier: TeamTier | undefined,
  locale: Locale,
  { withSlugs = false } = {}
): Promise<TeamMemberWithAlt[]> {
  const filter: QueryFilter = { limit: LIST_LIMIT, orderBy: { order: 'asc' }, ...(tier ? { where: { tier } } : {}) }
  const entries = await listEntries('team_members', filter, locale, { withSlugs })
  return entries.map((e) => {
    const d = e.data
    const item = withFallback(
      {
        slug: e.slug,
        name: d.name,
        role: d.role,
        tier: d.tier,
        imageUrl: resolveImage(d.photo),
        bio: d.bio,
        longBio: d.long_bio,
        quote: d.quote,
        since: d.since,
        from: d.from,
        basedIn: d.based_in,
        background: d.background ?? undefined,
        socialLinks: d.social_links ?? undefined,
        profileSlug: d.profile_slug || undefined,
        order: d.order,
      } satisfies TeamMemberItem,
      e
    )
    const profileSlugs = Object.fromEntries(
      Object.entries(e.variants).flatMap(([l, v]) => (v?.profile_slug ? [[l, v.profile_slug as string]] : []))
    )
    return { ...item, profileSlugs }
  })
}

function stripAlt({ profileSlugs: _, ...item }: TeamMemberWithAlt): TeamMemberItem {
  return item
}

export async function getTeamMembers(tier?: TeamTier, locale: Locale = DEFAULT_LOCALE): Promise<TeamMemberItem[]> {
  return (await listTeamMembers(tier, locale)).map(stripAlt)
}

// A person can appear in several tiers (one entry each) but has a single
// profile page. Prefer the entry carrying the long bio, then board, leader,
// staff — matching how the live site shows one profile per person.
const TIER_PRIORITY: TeamTier[] = ['board', 'leader', 'staff']

export async function getTeamMemberBySlug(
  slug: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<TeamMemberItem | undefined> {
  const matches = (await listTeamMembers(undefined, locale, { withSlugs: true })).filter(
    (m) => m.profileSlug === slug || m.profileSlugs.en === slug
  )
  const best = matches.sort(
    (a, b) => Number(Boolean(b.longBio)) - Number(Boolean(a.longBio)) || TIER_PRIORITY.indexOf(a.tier) - TIER_PRIORITY.indexOf(b.tier)
  )[0]
  return best ? { ...stripAlt(best), alternates: best.profileSlugs } : undefined
}

// --- Blog -----------------------------------------------------------

function postsFilter(category?: PostItem['category']): QueryFilter {
  return { limit: LIST_LIMIT, orderBy: { published_on: 'desc' }, ...(category ? { where: { category } } : {}) }
}

function toPost(e: LocalizedEntry): PostItem {
  const d = e.data
  return withFallback(
    {
      slug: e.slug,
      title: d.title,
      author: d.author,
      publishedAt: d.published_on,
      updatedAt: d.updated_on,
      category: d.category,
      excerpt: d.excerpt,
      imageUrl: resolveImage(d.image),
      body: d.body,
      featured: d.featured ?? false,
    } satisfies PostItem,
    e
  )
}

export async function getPosts(category?: PostItem['category'], locale: Locale = DEFAULT_LOCALE): Promise<PostItem[]> {
  return (await listEntries('posts', postsFilter(category), locale)).map(toPost)
}

export async function getPostBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<PostItem | undefined> {
  const e = (await listEntries('posts', postsFilter(), locale, { withSlugs: true })).find((x) => matchesSlug(x, slug))
  return e ? withAlternates(toPost(e), e) : undefined
}

export async function getFeaturedPosts(locale: Locale = DEFAULT_LOCALE): Promise<PostItem[]> {
  const all = await getPosts(undefined, locale)
  return all.filter((p) => p.featured)
}

// --- Resources -----------------------------------------------------------

const RESOURCES_FILTER: QueryFilter = { limit: LIST_LIMIT, orderBy: { published_on: 'desc' } }

function toResource(e: LocalizedEntry): ResourceItem {
  const d = e.data
  return withFallback(
    {
      slug: e.slug,
      title: d.title,
      categories: d.categories ?? [],
      publishedAt: d.published_on,
      updatedAt: d.updated_on,
      authors: d.authors ?? undefined,
      excerpt: d.excerpt,
      imageUrl: resolveImage(d.image),
      imageAlt: d.image?.alt,
      body: d.body ?? undefined,
      fileUrl: resolveImage(d.file),
      seo: toSeo(d),
    } satisfies ResourceItem,
    e
  )
}

// Newest first. multiSelect fields can't be indexed, so category filtering
// happens here rather than in the query.
export async function getResources(category?: ResourceCategory, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem[]> {
  const all = (await listEntries('resources', RESOURCES_FILTER, locale)).map(toResource)
  return category ? all.filter((r) => r.categories.includes(category)) : all
}

export function getResourcesByCategory(category: ResourceCategory, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem[]> {
  return getResources(category, locale)
}

export async function getResource(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<ResourceItem | undefined> {
  const e = (await listEntries('resources', RESOURCES_FILTER, locale, { withSlugs: true })).find((x) =>
    matchesSlug(x, slug)
  )
  return e ? withAlternates(toResource(e), e) : undefined
}

// --- Site-wide sponsors / sponsorship tiers -----------------------------

export async function getSponsors(locale: Locale = DEFAULT_LOCALE): Promise<Sponsor[]> {
  return (await listEntries('sponsors', { limit: LIST_LIMIT }, locale)).map((e) => toSponsor(e.data))
}

// Home page "Corporate Partners", in display order.
export async function getPartners(locale: Locale = DEFAULT_LOCALE): Promise<Sponsor[]> {
  const filter: QueryFilter = { where: { partner: true }, orderBy: { order: 'asc' }, limit: LIST_LIMIT }
  return (await listEntries('sponsors', filter, locale)).map((e) => toSponsor(e.data))
}

// General, site-wide sponsorship tiers (e.g. shown on Corporate
// Sponsorships). Event-specific tiers (scope: "event") are only reachable
// through that event's `sponsorPackages`, never listed here.
export async function getSponsorshipPackages(locale: Locale = DEFAULT_LOCALE): Promise<SponsorshipPackage[]> {
  const filter: QueryFilter = { where: { scope: 'general' }, orderBy: { order: 'asc' }, limit: LIST_LIMIT }
  return (await listEntries('sponsorship_packages', filter, locale)).map((e) => toSponsorshipPackage(e.data))
}

// --- FAQs -----------------------------------------------------------

export async function getFaqs(category?: Faq['category'], locale: Locale = DEFAULT_LOCALE): Promise<Faq[]> {
  const filter: QueryFilter = { limit: LIST_LIMIT, orderBy: { order: 'asc' }, ...(category ? { where: { category } } : {}) }
  return (await listEntries('faqs', filter, locale)).map((e) => {
    const d = e.data
    return {
      question: d.question,
      answer: d.answer,
      category: d.category,
      order: d.order,
    } satisfies Faq
  })
}

// --- Earthquake relief campaign -----------------------------------------------------------

export async function getCampaignUpdates(locale: Locale = DEFAULT_LOCALE): Promise<CampaignUpdate[]> {
  return (await listEntries('campaign_updates', { orderBy: { date: 'desc' }, limit: LIST_LIMIT }, locale)).map((e) => {
    const d = e.data
    return {
      title: d.title,
      date: d.date,
      imageUrl: resolveImage(d.image),
      videoUrl: d.video_url,
      body: d.body,
    } satisfies CampaignUpdate
  })
}

export async function getCampaignSettings(locale: Locale = DEFAULT_LOCALE): Promise<CampaignSettings> {
  const d = (await listEntries('campaign_settings', { limit: 1 }, locale))[0]?.data
  if (!d) return { active: false }
  return {
    active: d.active ?? false,
    bannerText: d.banner_text,
    donorboxCampaignId: d.donorbox_campaign_id,
  }
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
  return menu.items.map(toNavItem)
}
