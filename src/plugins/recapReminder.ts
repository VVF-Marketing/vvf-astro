// Recap reminder (spec 7.8; Q8 on the spec card: a dashboard reminder now,
// the email once the site has hosting). A dashboard widget lists every event
// whose date has passed while it's still marked upcoming, with the recap
// fields still empty, until an editor sets it to past or cancelled.
// Registered in astro.config.mjs.

export const WIDGET_ID = 'recap-reminder'

// Recap fields an editor fills in after the event (src/lib/contentModel.mjs).
export const RECAP_FIELDS: [string, string][] = [
  ['recap_headline', 'Recap headline'],
  ['recap_summary', 'Recap summary'],
  ['amount_raised', 'Amount raised'],
  ['stats', 'Stats'],
  ['gallery', 'Gallery'],
  ['recap_video', 'Recap video'],
]

interface EventLike {
  id: string
  locale?: string | null
  data: Record<string, unknown>
}

const empty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

// English events whose start date is before today and that are still upcoming.
export function eventsAwaitingRecap(events: EventLike[], now = new Date()): { id: string; name: string; start: string; missing: string[] }[] {
  const today = now.toISOString().slice(0, 10)
  return events
    .filter((e) => (e.locale ?? 'en') === 'en' && (e.data.lifecycle ?? 'upcoming') === 'upcoming')
    .filter((e) => typeof e.data.start === 'string' && (e.data.start as string).slice(0, 10) < today)
    .map((e) => ({
      id: e.id,
      name: String(e.data.name ?? 'Untitled event'),
      start: (e.data.start as string).slice(0, 10),
      missing: RECAP_FIELDS.filter(([k]) => empty(e.data[k])).map(([, label]) => label),
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function reminderBlocks(waiting: ReturnType<typeof eventsAwaitingRecap>) {
  if (waiting.length === 0) return { blocks: [{ type: 'context', text: 'No event is waiting for its recap.' }] }
  return {
    blocks: waiting.map((e) => ({
      type: 'banner',
      variant: 'alert',
      title: `${e.name} (${e.start}) is still marked upcoming`,
      description: `Its date has passed. Set Lifecycle to Past (or Cancelled) and fill in the recap.${e.missing.length ? ` Still empty: ${e.missing.join(', ')}.` : ''}`,
    })),
  }
}

export default {
  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        const input = routeCtx.input ?? {}
        if (input.type !== 'page_load' || input.page !== `widget:${WIDGET_ID}`) return { blocks: [] }
        const result = await ctx.content.list('events', { limit: 100 })
        return reminderBlocks(eventsAwaitingRecap(result.items))
      },
    },
  },
}
