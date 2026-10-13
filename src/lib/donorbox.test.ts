import { describe, expect, it } from 'vitest'
import {
  corporateSponsorshipInquiryUrl,
  earthquakeReliefUrl,
  eventSponsorUrl,
  eventTicketUrl,
  generalDonationUrl,
  sponsorChildEmbedUrl,
} from './donorbox'

describe('donorbox url builders', () => {
  it('builds the general donation url', () => {
    expect(generalDonationUrl()).toBe('https://donorbox.org/general-donation-vvf')
  })

  it('builds the earthquake relief url', () => {
    expect(earthquakeReliefUrl()).toBe('https://donorbox.org/venezuela-earthquake-relief')
  })

  it('builds an event ticket url from the donorbox event id', () => {
    expect(eventTicketUrl('golf-2026')).toBe('https://donorbox.org/events/golf-2026')
  })

  it('builds an event sponsor url without a tier', () => {
    expect(eventSponsorUrl('golf-2026')).toBe('https://donorbox.org/events/golf-2026')
  })

  it('builds an event sponsor url with an encoded tier query param', () => {
    expect(eventSponsorUrl('golf-2026', 'Gold Sponsor')).toBe(
      'https://donorbox.org/events/golf-2026?tier=Gold%20Sponsor'
    )
  })

  it('builds a sponsor-a-child embed url with the child slug as ref', () => {
    expect(sponsorChildEmbedUrl({ slug: 'maria-gonzalez' })).toBe(
      'https://donorbox.org/embed/make-a-difference-55?default_interval=m&ref=maria-gonzalez'
    )
  })

  it('tags a child donation with the English slug on the Spanish page', () => {
    const spanishPage = { slug: 'maria-gonzalez-es', alternates: { en: 'maria-gonzalez', es: 'maria-gonzalez-es' } }
    expect(sponsorChildEmbedUrl(spanishPage)).toBe(
      'https://donorbox.org/embed/make-a-difference-55?default_interval=m&ref=maria-gonzalez'
    )
  })

  it('routes corporate sponsorship inquiries to contact, not donorbox', () => {
    expect(corporateSponsorshipInquiryUrl()).toBe('/contact?topic=corporate-partnerships')
  })
})
