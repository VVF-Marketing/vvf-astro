// schema.org JSON-LD blocks (spec 7.1 NGO, 7.8 Event, 7.13 Article, plus
// WebSite, FAQPage, BreadcrumbList and Person for search and answer engines).
// Pages pass them to PageLayout's `jsonLd` prop; Breadcrumbs and FaqAccordion
// emit their own. Every node that names the foundation points at the NGO
// node's `@id`. The organization is named "Victoria Venezuela Foundation"
// everywhere, never "Inc." (spec 8.10).
import type { EventItem, Faq, ResourceItem, TeamMemberItem } from './content/types'
import { LANG_TAGS, localizePath, type Locale } from './i18n'

export const ORG = {
  name: 'Victoria Venezuela Foundation',
  email: 'info@victoriavenezuelafoundation.org',
  telephone: '+1-954-371-0557',
  taxID: '88-3282100',
  logo: '/images/logo.svg',
  image: '/images/og-default.jpg',
  address: { postOfficeBoxNumber: '327222', addressLocality: 'Weston', addressRegion: 'FL', postalCode: '33332', addressCountry: 'US' },
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/victoriavenezuelafoundation', icon: '/images/footer/facebook.svg' },
    { label: 'Instagram', href: 'https://www.instagram.com/victoriavenezuelafoundation/', icon: '/images/footer/instagram.svg' },
    // The footer links to the posts feed, as on live; `profile` is the page itself.
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/victoriavenezuelafoundation/posts/?feedView=all',
      profile: 'https://www.linkedin.com/company/victoriavenezuelafoundation/',
      icon: '/images/footer/linkedin.svg',
    },
    { label: 'YouTube', href: 'https://www.youtube.com/channel/UC5EnslQqm_S4KHb1_T3hnew', icon: '/images/footer/youtube.svg' },
  ],
  candid: 'https://app.candid.org/profile/14579501/victoria-venezuela-foundation-inc',
} as const

export type JsonLd = Record<string, unknown>

const abs = (path: string | undefined, site: URL) => (path ? new URL(path, site).href : undefined)

export const orgId = (site: URL) => new URL('/#organization', site).href

// The foundation as publisher, organizer or employer: its `@id`, plus name and
// URL for readers that don't join nodes across blocks (the NGO node is only
// on the home page).
function orgRef(site: URL): JsonLd {
  return { '@type': 'NGO', '@id': orgId(site), name: ORG.name, url: new URL('/', site).href }
}

export function ngo(site: URL, description: string, locale: Locale = 'en'): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': orgId(site),
    name: ORG.name,
    url: new URL('/', site).href,
    logo: abs(ORG.logo, site),
    image: abs(ORG.image, site),
    description,
    nonprofitStatus: 'Nonprofit501c3',
    taxID: ORG.taxID,
    email: ORG.email,
    telephone: ORG.telephone,
    address: { '@type': 'PostalAddress', ...ORG.address },
    contactPoint: { '@type': 'ContactPoint', contactType: 'general inquiries', email: ORG.email, telephone: ORG.telephone, availableLanguage: ['English', 'Spanish'] },
    areaServed: { '@type': 'Country', name: 'Venezuela' },
    potentialAction: { '@type': 'DonateAction', target: abs(localizePath('/ways-to-give', locale), site), recipient: { '@id': orgId(site) } },
    sameAs: [...ORG.social.map((s) => ('profile' in s ? s.profile : s.href)), ORG.candid],
  }
}

export function webSite(site: URL, locale: Locale): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': new URL('/#website', site).href,
    name: ORG.name,
    url: abs(localizePath('/', locale), site),
    inLanguage: LANG_TAGS[locale],
    publisher: { '@id': orgId(site) },
  }
}

export function faqPage(faqs: Pick<Faq, 'question' | 'answer'>[]): JsonLd | undefined {
  if (!faqs.length) return undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  }
}

// The visible trail, in order: linked items at their page in `locale`, the
// last (current) one at `currentUrl`.
export function breadcrumbList(items: { label: string; href?: string }[], site: URL, locale: Locale, currentUrl: string): JsonLd | undefined {
  if (!items.length) return undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: i === items.length - 1 || !item.href ? currentUrl : abs(localizePath(item.href, locale), site),
    })),
  }
}

export function person(member: Pick<TeamMemberItem, 'name' | 'role' | 'imageUrl' | 'linkedin'>, site: URL, url: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.name,
    jobTitle: member.role || undefined,
    image: abs(member.imageUrl, site),
    url,
    sameAs: member.linkedin ? [member.linkedin] : undefined,
    worksFor: orgRef(site),
  }
}

export function eventLd(event: EventItem, site: URL, url: string): JsonLd {
  const cancelled = event.lifecycle === 'cancelled'
  const open = event.registration === 'open' && !cancelled
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.summary || undefined,
    startDate: event.startDate || undefined,
    endDate: event.endDate || undefined,
    image: abs(event.seo?.imageUrl ?? event.imageUrl, site),
    url,
    eventStatus: `https://schema.org/${cancelled ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue || event.location || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address || undefined,
        addressLocality: event.city || undefined,
        addressRegion: event.state || undefined,
        addressCountry: 'US',
      },
    },
    organizer: orgRef(site),
    ...(open && event.registrationUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: event.registrationUrl,
            ...(event.ticketsFrom != null ? { price: event.ticketsFrom, priceCurrency: 'USD' } : {}),
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }
}

export function articleLd(article: ResourceItem, site: URL, url: string, locale: Locale = 'en'): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seo?.description || article.excerpt || undefined,
    inLanguage: LANG_TAGS[locale],
    image: abs(article.seo?.imageUrl ?? article.imageUrl, site),
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || undefined,
    author: article.authors?.length ? article.authors.map((a) => ({ '@type': 'Person', name: a.name })) : orgRef(site),
    publisher: orgRef(site),
    mainEntityOfPage: url,
  }
}

// JSON.stringify drops undefined; `<` is escaped so text can't close the tag.
export function serialize(block: JsonLd): string {
  return JSON.stringify(block).replace(/</g, '\\u003c')
}
