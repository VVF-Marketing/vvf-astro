// Content adapter: every page/component reads through the functions below,
// never through EmDash's query functions directly. Content lives in EmDash
// (schema + seed data checked in at seed/seed.json, applied to the local
// SQLite database via `npx emdash seed seed/seed.json`).
import { getEmDashCollection, getEmDashEntry, getMenu, type MenuItem } from 'emdash'
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

function toSeo(d: Record<string, any>): Seo | undefined {
  const seo = { title: d.seo_title, description: d.seo_description, imageUrl: resolveImage(d.social_image) }
  return seo.title || seo.description || seo.imageUrl ? seo : undefined
}

async function resolveRefs<T>(
  collection: string,
  ids: unknown,
  map: (data: Record<string, any>) => T
): Promise<T[] | undefined> {
  if (!Array.isArray(ids) || ids.length === 0) return undefined
  const entries = await Promise.all(ids.map((id) => getEmDashEntry(collection, String(id))))
  return entries.flatMap((r) => (r.entry ? [map(r.entry.data as Record<string, any>)] : []))
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

export async function getEvents(): Promise<EventItem[]> {
  const { entries } = await getEmDashCollection('events', { limit: LIST_LIMIT })
  return Promise.all(
    entries.map(async (e) => {
      const d = e.data as Record<string, any>
      return {
        slug: e.slug ?? '',
        title: d.title,
        startDate: d.start_date,
        location: d.location,
        description: d.description,
        imageUrl: resolveImage(d.image),
        category: d.category,
        donorboxEventId: d.donorbox_event_id,
        sponsorPackages: await resolveRefs('sponsorship_packages', d.sponsor_packages, toSponsorshipPackage),
        auctionItems: await resolveRefs('auction_items', d.auction_items, toAuctionItem),
        sponsors: await resolveRefs('sponsors', d.sponsors, toSponsor),
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
      } satisfies EventItem
    })
  )
}

export async function getEventBySlug(slug: string): Promise<EventItem | undefined> {
  const all = await getEvents()
  return all.find((e) => e.slug === slug)
}

export function isUpcoming(event: Pick<EventItem, 'startDate'>): boolean {
  return new Date(event.startDate).getTime() >= Date.now()
}

// --- Children -----------------------------------------------------------

export async function getChildren(): Promise<ChildItem[]> {
  const { entries } = await getEmDashCollection('children', {
    where: { published: true },
    orderBy: { order: 'asc' },
    limit: LIST_LIMIT,
  })
  return entries.map((e) => {
    const d = e.data as Record<string, any>
    return {
      slug: e.slug ?? '',
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
    } satisfies ChildItem
  })
}

export async function getChildBySlug(slug: string): Promise<ChildItem | undefined> {
  const all = await getChildren()
  return all.find((c) => c.slug === slug)
}

// --- Team -----------------------------------------------------------

export async function getTeamMembers(tier?: TeamTier): Promise<TeamMemberItem[]> {
  const { entries } = await getEmDashCollection('team_members', {
    limit: LIST_LIMIT,
    orderBy: { order: 'asc' },
    ...(tier ? { where: { tier } } : {}),
  })
  return entries.map((e) => {
    const d = e.data as Record<string, any>
    return {
      slug: e.slug ?? '',
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
    } satisfies TeamMemberItem
  })
}

// A person can appear in several tiers (one entry each) but has a single
// profile page. Prefer the entry carrying the long bio, then board, leader,
// staff — matching how the live site shows one profile per person.
const TIER_PRIORITY: TeamTier[] = ['board', 'leader', 'staff']

export async function getTeamMemberBySlug(slug: string): Promise<TeamMemberItem | undefined> {
  const matches = (await getTeamMembers()).filter((m) => m.profileSlug === slug)
  return matches.sort(
    (a, b) => Number(Boolean(b.longBio)) - Number(Boolean(a.longBio)) || TIER_PRIORITY.indexOf(a.tier) - TIER_PRIORITY.indexOf(b.tier)
  )[0]
}

// --- Blog -----------------------------------------------------------

export async function getPosts(category?: PostItem['category']): Promise<PostItem[]> {
  const { entries } = await getEmDashCollection('posts', {
    limit: LIST_LIMIT,
    orderBy: { published_on: 'desc' },
    ...(category ? { where: { category } } : {}),
  })
  return entries.map((e) => {
    const d = e.data as Record<string, any>
    return {
      slug: e.slug ?? '',
      title: d.title,
      author: d.author,
      publishedAt: d.published_on,
      updatedAt: d.updated_on,
      category: d.category,
      excerpt: d.excerpt,
      imageUrl: resolveImage(d.image),
      body: d.body,
      featured: d.featured ?? false,
    } satisfies PostItem
  })
}

export async function getPostBySlug(slug: string): Promise<PostItem | undefined> {
  const all = await getPosts()
  return all.find((p) => p.slug === slug)
}

export async function getFeaturedPosts(): Promise<PostItem[]> {
  const all = await getPosts()
  return all.filter((p) => p.featured)
}

// --- Resources -----------------------------------------------------------

function toResource(slug: string, d: Record<string, any>): ResourceItem {
  return {
    slug,
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
  }
}

// Newest first. multiSelect fields can't be indexed, so category filtering
// happens here rather than in the query.
export async function getResources(category?: ResourceCategory): Promise<ResourceItem[]> {
  const { entries } = await getEmDashCollection('resources', { limit: LIST_LIMIT, orderBy: { published_on: 'desc' } })
  const all = entries.map((e) => toResource(e.slug ?? '', e.data as Record<string, any>))
  return category ? all.filter((r) => r.categories.includes(category)) : all
}

export function getResourcesByCategory(category: ResourceCategory): Promise<ResourceItem[]> {
  return getResources(category)
}

export async function getResource(slug: string): Promise<ResourceItem | undefined> {
  return (await getResources()).find((r) => r.slug === slug)
}

// --- Site-wide sponsors / sponsorship tiers -----------------------------

export async function getSponsors(): Promise<Sponsor[]> {
  const { entries } = await getEmDashCollection('sponsors', { limit: LIST_LIMIT })
  return entries.map((e) => toSponsor(e.data as Record<string, any>))
}

// Home page "Corporate Partners", in display order.
export async function getPartners(): Promise<Sponsor[]> {
  const { entries } = await getEmDashCollection('sponsors', {
    where: { partner: true },
    orderBy: { order: 'asc' },
    limit: LIST_LIMIT,
  })
  return entries.map((e) => toSponsor(e.data as Record<string, any>))
}

// General, site-wide sponsorship tiers (e.g. shown on Corporate
// Sponsorships). Event-specific tiers (scope: "event") are only reachable
// through that event's `sponsorPackages`, never listed here.
export async function getSponsorshipPackages(): Promise<SponsorshipPackage[]> {
  const { entries } = await getEmDashCollection('sponsorship_packages', {
    where: { scope: 'general' },
    orderBy: { order: 'asc' },
    limit: LIST_LIMIT,
  })
  return entries.map((e) => toSponsorshipPackage(e.data as Record<string, any>))
}

// --- FAQs -----------------------------------------------------------

export async function getFaqs(category?: Faq['category']): Promise<Faq[]> {
  const { entries } = await getEmDashCollection('faqs', {
    limit: LIST_LIMIT,
    orderBy: { order: 'asc' },
    ...(category ? { where: { category } } : {}),
  })
  return entries.map((e) => {
    const d = e.data as Record<string, any>
    return {
      question: d.question,
      answer: d.answer,
      category: d.category,
      order: d.order,
    } satisfies Faq
  })
}

// --- Earthquake relief campaign -----------------------------------------------------------

export async function getCampaignUpdates(): Promise<CampaignUpdate[]> {
  const { entries } = await getEmDashCollection('campaign_updates', { orderBy: { date: 'desc' }, limit: LIST_LIMIT })
  return entries.map((e) => {
    const d = e.data as Record<string, any>
    return {
      title: d.title,
      date: d.date,
      imageUrl: resolveImage(d.image),
      videoUrl: d.video_url,
      body: d.body,
    } satisfies CampaignUpdate
  })
}

export async function getCampaignSettings(): Promise<CampaignSettings> {
  const { entries } = await getEmDashCollection('campaign_settings', { limit: 1 })
  const d = entries[0]?.data as Record<string, any> | undefined
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

export async function getPrimaryMenu(): Promise<NavItem[]> {
  const menu = await getMenu('primary')
  if (!menu) return []
  return menu.items.map(toNavItem)
}
