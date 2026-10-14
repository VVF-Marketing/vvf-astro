// Campaign cards on Events & Campaigns (spec 7.7). There's no campaign
// content type yet: each campaign is a numbered set of copy slots on the
// page (src/pages/events-and-campaigns/_copy.ts), and its status decides
// where it shows. A slot with no status or no title shows nowhere.

export interface Campaign {
  status: 'active' | 'completed'
  title: string
  dates?: string
  summary?: string
  link?: string
  imageUrl?: string
  imageAlt?: string
  // YYYY-MM-DD, for ordering completed campaigns among past events.
  ended?: string
}

export function campaignsFrom(copy: Record<string, string | undefined>, slots: number[]): Campaign[] {
  return slots.flatMap((n) => {
    const get = (k: string) => copy[`campaign${n}.${k}`]?.trim() || undefined
    const status = get('status')?.toLowerCase()
    const title = get('title')
    if ((status !== 'active' && status !== 'completed') || !title) return []
    return [{ status, title, dates: get('dates'), summary: get('summary'), link: get('link'), imageUrl: get('image'), imageAlt: get('imageAlt'), ended: get('ended') }]
  })
}

export type ArchiveItem<E> = { kind: 'event'; date: string; event: E } | { kind: 'campaign'; date: string; campaign: Campaign }

// Past events and completed campaigns, newest first (spec 7.7, section 4).
export function archiveItems<E extends { startDate: string }>(pastEvents: E[], campaigns: Campaign[]): ArchiveItem<E>[] {
  const items: ArchiveItem<E>[] = [
    ...pastEvents.map((event) => ({ kind: 'event' as const, date: event.startDate, event })),
    ...campaigns.filter((c) => c.status === 'completed').map((campaign) => ({ kind: 'campaign' as const, date: campaign.ended ?? '', campaign })),
  ]
  return items.sort((a, b) => b.date.localeCompare(a.date))
}
