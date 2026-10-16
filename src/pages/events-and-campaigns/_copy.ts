// Copy slots for /events-and-campaigns (src/lib/copy.ts). Labels are the live
// page's. Campaigns are cards on this page, not a content type (spec 7.7):
// editors add one by filling a campaign slot, and end it by setting its
// status to "completed" (it moves to the archive) or clearing the status.
import { defineCopy, seoSlots } from '../../lib/copy'

const CAMPAIGN_SLOTS = 3
const campaign = (n: number, defaults: { status?: string; dates?: string; title?: string; summary?: string; link?: string; image?: string; imageAlt?: string; ended?: string } = {}) => ({
  [`campaign${n}.status`]: { label: `Campaign ${n}: status (active, completed, or empty to hide)`, default: defaults.status ?? '', maxLength: 10 },
  [`campaign${n}.title`]: { label: `Campaign ${n}: title`, default: defaults.title ?? '', maxLength: 60 },
  [`campaign${n}.dates`]: { label: `Campaign ${n}: date range`, default: defaults.dates ?? '', maxLength: 40 },
  [`campaign${n}.summary`]: { label: `Campaign ${n}: summary`, default: defaults.summary ?? '', maxLength: 200 },
  [`campaign${n}.link`]: { label: `Campaign ${n}: link to its page`, default: defaults.link ?? '', maxLength: 200 },
  [`campaign${n}.image`]: { label: `Campaign ${n}: photo`, format: 'image' as const, default: defaults.image ?? '' },
  [`campaign${n}.imageAlt`]: { label: `Campaign ${n}: photo description`, default: defaults.imageAlt ?? '', maxLength: 140 },
  // Sorts completed campaigns among past events in the archive (YYYY-MM-DD).
  [`campaign${n}.ended`]: { label: `Campaign ${n}: end date for the archive (YYYY-MM-DD)`, default: defaults.ended ?? '', maxLength: 10 },
})

export const CAMPAIGNS = Array.from({ length: CAMPAIGN_SLOTS }, (_, i) => i + 1)

export default defineCopy('/events-and-campaigns', {
  ...seoSlots({
    title: 'Events & Campaigns | Victoria Venezuela Foundation',
    description: 'Events and campaigns from Victoria Venezuela Foundation, including our annual charity golf tournament in Weston, FL, supporting children in Venezuela.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),
  'hero.imageAlt': { label: 'Hero: image description', default: 'A golfer hugging a young boy on the course at the charity golf tournament.', maxLength: 120 },
  'hero.heading': { label: 'Hero: heading', default: 'Events & Campaigns', maxLength: 30 },
  'hero.subtext': { label: 'Hero: text', default: 'Join our community and make an impact. Together we gather to support those in need across Venezuela.', maxLength: 150 },
  'tabs.events': { label: 'Phone tabs: events', default: 'Events', maxLength: 20 },
  'tabs.campaigns': { label: 'Phone tabs: campaigns', default: 'Campaigns', maxLength: 20 },
  'campaigns.eyebrow': { label: 'Active campaigns: eyebrow', default: 'Campaigns', maxLength: 20 },
  'campaigns.heading': { label: 'Active campaigns: heading', default: 'Active campaigns', maxLength: 40 },
  'campaigns.button': { label: 'Campaign card: button', default: 'Learn More', maxLength: 20 },
  'upcoming.eyebrow': { label: 'Upcoming events: eyebrow', default: 'Events', maxLength: 20 },
  'upcoming.heading': { label: 'Upcoming events: heading', default: 'Upcoming events', maxLength: 40 },
  'archive.eyebrow': { label: 'Archive: eyebrow', default: 'Archive', maxLength: 20 },
  'archive.heading': { label: 'Archive: heading', default: 'Past events and campaigns', maxLength: 40 },
  'archive.button': { label: 'Archive card: button', default: 'See highlights', maxLength: 30 },
  'archive.concluded': { label: 'Archive card: band on the photo', default: 'Concluded', maxLength: 20 },
  'tag.event': { label: 'Archive card tag: event', default: 'EVENT', maxLength: 20 },
  'tag.campaign': { label: 'Archive card tag: campaign', default: 'CAMPAIGN', maxLength: 20 },
  'list.seeAll': { label: 'Lists: "See all" button ({count} is replaced)', default: 'See all {count}', maxLength: 30 },
  'newsletterSignup.heading': { label: 'Newsletter: heading', default: 'Keep up with our events and campaigns', maxLength: 50 },
  'newsletterSignup.text': { label: 'Newsletter: text', default: 'Get event invitations and campaign updates in your inbox', maxLength: 80 },
  ...campaign(1, {
    status: 'active',
    dates: 'June – November 2026',
    title: 'Venezuela Earthquake Relief',
    summary: 'Back-to-back earthquakes hit Venezuela in June 2026. 100% of net proceeds go to relief for displaced children and families.',
    link: '/venezuela-earthquake-relief',
    image: '/images/pages/campaign-earthquake-relief.webp',
    imageAlt: 'A woman in a yellow shirt hands a drink to a young boy outside a damaged home.',
    ended: '2026-11-30',
  }),
  ...campaign(2),
  ...campaign(3),
})
