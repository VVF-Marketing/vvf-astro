// Storybook-only stand-in for src/lib/content/index.ts, aliased in
// .storybook/main.ts's viteFinal for the exact literal specifier
// `../lib/content` (both Header.astro and EventCard.astro import it that
// way). Real content/index.ts pulls in `emdash`'s CMS client at module scope
// to talk to the local sqlite DB, so importing it here (even just to
// re-export a helper) would risk needing a live DB during Storybook dev/build,
// exactly what this mock exists to avoid. `isUpcoming` is duplicated instead
// of re-exported for that reason, it's a pure one-line date comparison, see
// src/lib/content/index.ts.
import type { NavItem, EventItem } from '../../src/lib/content/types'

export async function getPrimaryMenu(): Promise<NavItem[]> {
  return [
    {
      label: 'Make a Difference',
      url: '#',
      children: [
        { label: 'Ways to Give', url: '/ways-to-give' },
        { label: 'Sponsor a Child', url: '/sponsor-a-child' },
        { label: 'Corporate Sponsorships', url: '/corporate-sponsorships' },
      ],
    },
    { label: 'Get Involved', url: '#', children: [{ label: 'Events', url: '/events' }] },
    { label: 'Our Team', url: '/our-team' },
    {
      label: 'Resources',
      url: '#',
      children: [
        { label: 'All Resources', url: '/resources' },
        { label: 'Stories', url: '/resources/category/stories' },
        { label: 'Financials & Transparency', url: '/resources/category/financials-transparency' },
      ],
    },
  ]
}

export function isUpcoming(event: Pick<EventItem, 'startDate'>): boolean {
  return new Date(event.startDate).getTime() >= Date.now()
}
