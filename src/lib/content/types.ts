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

export type Lifecycle = 'upcoming' | 'past' | 'cancelled'
export type Registration = 'open' | 'sold_out' | 'closed' | 'not_needed'

export interface EventItem extends Localized {
  slug: string
  title: string
  startDate: string // ISO
  endDate?: string
  lifecycle: Lifecycle
  registration: Registration
  featured: boolean
  summary?: string
  city?: string
  state?: string
  registrationUrl?: string
  ticketsFrom?: number
  amountRaised?: string
  stats?: { value: string; label?: string }[]
  recapVideo?: string
  faqs?: Faq[]
  previousEditions?: { slug: string; title: string; startDate: string }[]
  nextEdition?: { slug: string; title: string; startDate: string }
  // Sponsorship benefits grid (spec 4.5-6): one column per package offer.
  benefitGrid?: { columns: string[]; rows: { section: string; name: string; cells: { check?: boolean; text?: string }[] }[] }
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
  // Optional appeal section (e.g. the 2026 tournament's earthquake relief).
  appeal?: {
    heading: string
    text?: string
    imageUrl?: string
    imageAlt?: string
    caption?: string
    cardsLabel?: string
    cards: { title: string; text: string; imageUrl?: string; imageAlt?: string }[]
    cta?: { label: string; href: string }
  }
  contact?: { phone?: string; email?: string; address?: string }
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
  sponsorshipStatus: 'available' | 'sponsored' | 'graduated'
  order?: number
  donorboxSponsorshipRef?: string
}

export type TeamTier = 'board' | 'leader' | 'staff'

export interface TeamMemberItem extends Localized {
  slug: string
  name: string
  role: string
  tier: TeamTier
  groups: TeamTier[]
  boardPosition?: string
  title?: string
  openSeat?: boolean
  linkedin?: string
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

// News (spec 3.1) shows only while a News article is published: see hasNews().
export const RESOURCE_CATEGORIES = ['stories', 'financials-transparency', 'news'] as const
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

// Short labels (tags, breadcrumbs, filter pills) and full page titles, as
// used on the live site.
export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  stories: 'Stories',
  'financials-transparency': 'Financials',
  news: 'News',
}

export const RESOURCE_CATEGORY_TITLES: Record<ResourceCategory, string> = {
  stories: 'Stories',
  'financials-transparency': 'Financials & Transparency',
  news: 'News',
}

// Each category's label in the page's language, from the site-wide copy
// slots (`t` is getGlobalCopy's result): tags, filter pills, breadcrumbs.
export function resourceCategoryLabels(t: Record<string, string>): Record<ResourceCategory, string> {
  return {
    stories: t['resources.category.stories'],
    'financials-transparency': t['resources.category.financials'],
    news: t['resources.category.news'],
  }
}

// Path segment of each category's listing page, /resources/<path> (spec 2.2).
export const RESOURCE_CATEGORY_PATHS: Record<ResourceCategory, string> = {
  stories: 'stories',
  'financials-transparency': 'financials',
  news: 'news',
}

// The category listed at /resources/<path>, if that path is a category page.
export function categoryForPath(path: string): ResourceCategory | undefined {
  return RESOURCE_CATEGORIES.find((c) => RESOURCE_CATEGORY_PATHS[c] === path)
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

export type ReportKind = 'annual' | 'quarterly'

export interface ResourceItem extends Localized {
  slug: string
  title: string
  categories: ResourceCategory[]
  // Set on financial reports listed on Financials & Transparency.
  reportKind?: ReportKind
  publishedAt?: string
  updatedAt?: string
  authors?: { name: string; role?: string }[]
  excerpt?: string
  imageUrl?: string
  imageAlt?: string
  body?: PortableTextBlock[]
  fileUrl?: string
  featured?: boolean
  external?: boolean
  externalUrl?: string
  outlet?: string
  languageTag?: string
  seo?: Seo
}

export interface SiteFact {
  key: 'meals_served' | 'medical_visits' | 'children_in_programs' | 'children_in_education' | 'corporate_sponsors' | 'program_share'
  value: string
  label: string
  detail?: string
  period: string
}

export interface Testimonial {
  quote: string
  name: string
  role?: string
  imageUrl?: string
}

export interface NavItem {
  label: string
  url: string
  children?: NavItem[]
}

// Age ranges of the child list filter (spec 7.3).
export const CHILD_AGE_RANGES = ['1-5', '6-10', '11-15', '16+'] as const
export type ChildAgeRange = (typeof CHILD_AGE_RANGES)[number]

export function ageRangeOf(age: number): ChildAgeRange {
  if (age <= 5) return '1-5'
  if (age <= 10) return '6-10'
  if (age <= 15) return '11-15'
  return '16+'
}
