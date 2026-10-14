// schema.org JSON-LD blocks (spec 7.1 NGO, 7.8 Event, 7.13 Article). Pages
// pass them to PageLayout's `jsonLd` prop. The organization is named
// "Victoria Venezuela Foundation" everywhere, never "Inc." (spec 8.10).
import type { EventItem, ResourceItem } from './content/types'

export const ORG = {
  name: 'Victoria Venezuela Foundation',
  email: 'info@victoriavenezuelafoundation.org',
  telephone: '+1-954-371-0557',
  taxID: '88-3282100',
  logo: '/images/logo.svg',
  address: { postOfficeBoxNumber: '327222', addressLocality: 'Weston', addressRegion: 'FL', postalCode: '33332', addressCountry: 'US' },
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/victoriavenezuelafoundation', icon: '/images/footer/facebook.svg' },
    { label: 'Instagram', href: 'https://www.instagram.com/victoriavenezuelafoundation/', icon: '/images/footer/instagram.svg' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/victoriavenezuelafoundation/posts/?feedView=all', icon: '/images/footer/linkedin.svg' },
    { label: 'YouTube', href: 'https://www.youtube.com/channel/UC5EnslQqm_S4KHb1_T3hnew', icon: '/images/footer/youtube.svg' },
  ],
  candid: 'https://app.candid.org/profile/14579501/victoria-venezuela-foundation-inc',
} as const

export type JsonLd = Record<string, unknown>

const abs = (path: string | undefined, site: URL) => (path ? new URL(path, site).href : undefined)

// The foundation as publisher or organizer, by reference to the NGO block.
function orgRef(site: URL): JsonLd {
  return { '@type': 'NGO', name: ORG.name, url: new URL('/', site).href, logo: abs(ORG.logo, site) }
}

export function ngo(site: URL, description: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': new URL('/#organization', site).href,
    name: ORG.name,
    url: new URL('/', site).href,
    logo: abs(ORG.logo, site),
    description,
    nonprofitStatus: 'Nonprofit501c3',
    taxID: ORG.taxID,
    email: ORG.email,
    telephone: ORG.telephone,
    address: { '@type': 'PostalAddress', ...ORG.address },
    sameAs: [...ORG.social.map((s) => s.href), ORG.candid],
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

export function articleLd(article: ResourceItem, site: URL, url: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
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
