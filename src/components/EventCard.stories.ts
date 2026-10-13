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
      category: 'golf-tournament',
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
      category: 'golf-tournament',
    } satisfies EventItem,
  },
}
