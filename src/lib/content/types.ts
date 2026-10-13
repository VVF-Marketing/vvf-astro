// Normalized content shapes every page/component consumes, sourced from
// EmDash (see src/lib/content/index.ts). Images are always resolved to a
// plain URL (or omitted) — components never touch the raw CMS shape.
import type { Locale } from '../i18n'

// Set on an item requested in another locale but served from English
// because it has no translation yet. Detail getters also report the item's
// slug in each locale it exists in (for hreflang and the language switch).
interface Localized {
  fallbackLocale?: Locale
  alternates?: Partial<Record<Locale, string>>
}

export interface EventItem extends Localized {
  slug: string
  title: string
  startDate: string // ISO
  location: string
  description?: string
  imageUrl?: string
  category?: 'golf-tournament' | 'community' | 'awareness'
  donorboxEventId?: string
  sponsorPackages?: SponsorshipPackage[]
  auctionItems?: AuctionItem[]
  sponsors?: Sponsor[]
  heroHeading?: string
  heroBody?: string
  heroImageUrl?: string
  heroImageMobileUrl?: string
  venue?: string
  address?: string
  mapUrl?: string
  program?: PortableTextBlock[]
  includes?: PortableTextBlock[]
  gallery?: { url: string; alt?: string }[]
  recapStats?: { number: string; heading?: string; label?: string }[]
  // Sponsorship benefits comparison: one value per `package` offer, in order.
  benefitRows?: { section: string; name: string; values: string[] }[]
  seo?: Seo
}

export interface ChildItem extends Localized {
  slug: string
  displayName: string
  age: number
  birthday?: string
  gender?: 'Male' | 'Female'
  dream?: string
  about?: string
  imageUrl?: string
  imageAlt?: string
  published: boolean
  order?: number
  donorboxSponsorshipRef?: string
}

export type TeamTier = 'board' | 'leader' | 'staff'

export interface TeamMemberItem extends Localized {
  slug: string
  name: string
  role: string
  tier: TeamTier
  imageUrl?: string
  bio?: string
  longBio?: string
  quote?: string
  since?: string
  from?: string
  basedIn?: string
  background?: { label: string; value: string }[]
  socialLinks?: { platform: 'linkedin' | 'x' | 'website'; url: string }[]
  // Slug of this person's profile page; undefined when they have none.
  profileSlug?: string
  order?: number
}

export interface PostItem extends Localized {
  slug: string
  title: string
  author?: string
  publishedAt: string
  updatedAt?: string
  category: 'Stories' | 'Events' | 'Financials' | 'News'
  excerpt?: string
  imageUrl?: string
  body?: string
  featured?: boolean
}

export interface Sponsor {
  name: string
  logoUrl?: string
  website?: string
}

export interface SponsorshipPackage {
  tierName: string
  price?: string
  recognitionBenefits?: string[]
  activityBenefits?: string[]
  promotionalBenefits?: string[]
  // Event offers: flat benefit list, kind and call to action.
  benefits?: string[]
  kind?: 'ticket' | 'package' | 'special'
  shortName?: string
  ctaLabel?: string
  ctaUrl?: string
  soldOut?: boolean
  order?: number
}

export interface AuctionItem {
  name: string
  imageUrl?: string
  estimatedValue?: string
  bidUrl?: string
}

export interface Faq {
  question: string
  answer: string
  category: 'sponsorship' | 'donation' | 'tournament' | 'general'
  order?: number
}

export interface CampaignUpdate {
  title: string
  date: string
  imageUrl?: string
  videoUrl?: string
  body?: string
}

export interface CampaignSettings {
  active: boolean
  bannerText?: string
  donorboxCampaignId?: string
}

// Portable Text block as stored by EmDash; rendered by the PortableText
// component, never inspected by pages.
export type PortableTextBlock = { _type: string; _key?: string; [key: string]: unknown }

export interface Seo {
  title?: string
  description?: string
  imageUrl?: string
}

export const RESOURCE_CATEGORIES = ['stories', 'financials-transparency'] as const
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

// Short labels (tags, breadcrumbs, filter pills) and full page titles, as
// used on the live site.
export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  stories: 'Stories',
  'financials-transparency': 'Financials',
}

export const RESOURCE_CATEGORY_TITLES: Record<ResourceCategory, string> = {
  stories: 'Stories',
  'financials-transparency': 'Financials & Transparency',
}

// Tag shown on resource cards: Financials wins when an item is in both
// categories, as on the live site.
// `labels` lets pages pass the localized labels from their copy slots.
export function resourceTag(
  r: { categories: ResourceCategory[] },
  labels: Record<ResourceCategory, string> = RESOURCE_CATEGORY_LABELS
): string | undefined {
  const c = r.categories.includes('financials-transparency') ? 'financials-transparency' : r.categories[0]
  return c ? labels[c] : undefined
}

export interface ResourceItem extends Localized {
  slug: string
  title: string
  categories: ResourceCategory[]
  publishedAt?: string
  updatedAt?: string
  authors?: { name: string; role?: string }[]
  excerpt?: string
  imageUrl?: string
  imageAlt?: string
  body?: PortableTextBlock[]
  fileUrl?: string
  seo?: Seo
}

export interface NavItem {
  label: string
  url: string
  children?: NavItem[]
}

export const CHILD_AGE_RANGES = ['0-2', '3-5', '6-8', '9-11', '12-14', '15+'] as const
export type ChildAgeRange = (typeof CHILD_AGE_RANGES)[number]

export function ageRangeOf(age: number): ChildAgeRange {
  if (age <= 2) return '0-2'
  if (age <= 5) return '3-5'
  if (age <= 8) return '6-8'
  if (age <= 11) return '9-11'
  if (age <= 14) return '12-14'
  return '15+'
}
