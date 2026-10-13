// Donorbox targets resolved by the PDF's Navigation Reference / CTA Re-audit
// pages. See donation-integration/spec.md for the routing rules these
// implement. Sponsor-a-child's exact campaign slug wasn't given in the nav
// map (only that it's a Donorbox-embedded form); `sponsorChildEmbedUrl`
// uses the campaign the live Webflow child pages embed.

const GENERAL_DONATION_CAMPAIGN = 'general-donation-vvf'
const EARTHQUAKE_RELIEF_CAMPAIGN = 'venezuela-earthquake-relief'
// Campaign used by every child page on the live site (dbox-widget).
const SPONSOR_CHILD_CAMPAIGN = 'make-a-difference-55'

export function generalDonationUrl(): string {
  return `https://donorbox.org/${GENERAL_DONATION_CAMPAIGN}`
}

export function earthquakeReliefUrl(): string {
  return `https://donorbox.org/${EARTHQUAKE_RELIEF_CAMPAIGN}`
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

export function sponsorChildEmbedUrl(childSlug: string): string {
  return `https://donorbox.org/embed/${SPONSOR_CHILD_CAMPAIGN}?default_interval=m&ref=${encodeURIComponent(childSlug)}`
}

// Corporate Sponsorships' "Partner with Us" CTA deliberately does NOT go to
// Donorbox — it routes to the inquiry flow (see donation-integration:
// Corporate sponsorship inquiry).
export function corporateSponsorshipInquiryUrl(): string {
  return '/contact?topic=corporate-partnerships'
}
