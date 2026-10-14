// Donorbox targets resolved by the PDF's Navigation Reference / CTA Re-audit
// pages. See donation-integration/spec.md for the routing rules these
// implement. Sponsor-a-child's exact campaign slug wasn't given in the nav
// map (only that it's a Donorbox-embedded form); `sponsorChildEmbedUrl`
// uses the campaign the live Webflow child pages embed.
//
// Campaign IDs are stored once, in the CMS's Donorbox campaigns entry
// (spec 8.1, rule 1; getDonorboxCampaigns). The defaults are today's IDs,
// for when that entry is missing.
import { contactHref } from './contactTopics'
import { DONORBOX_CAMPAIGNS } from './contentModel.mjs'

export function generalDonationUrl(campaign: string = DONORBOX_CAMPAIGNS.general): string {
  return `https://donorbox.org/${campaign}`
}

export function earthquakeReliefUrl(campaign: string = DONORBOX_CAMPAIGNS.earthquake): string {
  return `https://donorbox.org/${campaign}`
}

export function eventTicketUrl(donorboxEventId: string): string {
  return `https://donorbox.org/events/${donorboxEventId}`
}

// Ticket purchase and sponsor-package purchase both resolve to the same
// underlying Donorbox event (see donation-integration: Event ticketing and
// sponsorship). Tier is passed as a query param Donorbox can pre-select.
export function eventSponsorUrl(donorboxEventId: string, tierName?: string): string {
  const url = eventTicketUrl(donorboxEventId)
  return tierName ? `${url}?tier=${encodeURIComponent(tierName)}` : url
}

// `ref` tells the foundation which child a donation is for, so it's the
// child's English slug on every locale's page: a Spanish slug that differs
// would file the same child's donations under a second reference.
export function sponsorChildEmbedUrl(child: { slug: string; alternates?: { en?: string } }, campaign: string = DONORBOX_CAMPAIGNS.sponsorship): string {
  const ref = child.alternates?.en || child.slug
  return `https://donorbox.org/embed/${campaign}?default_interval=m&ref=${encodeURIComponent(ref)}`
}

// Corporate Sponsorships' "Partner with Us" CTA deliberately does NOT go to
// Donorbox — it routes to the inquiry flow (see donation-integration:
// Corporate sponsorship inquiry).
export function corporateSponsorshipInquiryUrl(): string {
  return contactHref('Corporate partnership')
}
