import EventCard from './EventCard.astro'
import type { EventItem } from '../lib/content/types'

export default {
  title: 'Molecules/EventCard',
  component: EventCard,
}

export const Upcoming = {
  args: {
    event: {
      slug: '2026-golf-tournament',
      title: '2026 Annual Golf Charity Tournament',
      startDate: '2026-11-09T00:00:00.000Z',
      location: '2600 Country Club Way, Weston, FL 33332',
      description: 'Every swing changes a life. Help us support Venezuelan children with education, nutrition, and hope.',
      imageUrl: '/seed-media/events/56f00201-98.png',
      lifecycle: 'upcoming',
      registration: 'open',
      featured: true,
    } satisfies EventItem,
  },
}

// A card photo, cropped with the players centered, replaces the hero
// photos at every width.
export const CardPhoto = {
  args: {
    event: {
      ...Upcoming.args.event,
      heroImageMobileUrl: '/seed-media/events/bd83b6bf-vvf-golf2025-0j1a2701-v2.webp',
      cardImageUrl: '/seed-media/events/6ed2bb4b-vvf-golf2026-cardphoto-v1.jpeg',
    } satisfies EventItem,
  },
}

export const Past = {
  args: {
    event: {
      slug: '2025-golf-tournament',
      title: '2025 Annual Golf Charity Tournament',
      startDate: '2025-11-10T00:00:00.000Z',
      location: 'Weston',
      description: '74 golfers came together at The Club at Weston Hills to support over 700 children in Venezuela.',
      lifecycle: 'upcoming',
      registration: 'open',
      featured: true,
    } satisfies EventItem,
  },
}
