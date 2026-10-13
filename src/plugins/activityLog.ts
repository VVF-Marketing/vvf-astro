// Activity log: records who published or unpublished what, and how (an AI
// assistant over MCP, an API token, or a person in the admin), and lists it
// on an admin-only "Activity" page. Registered in astro.config.mjs.
//
// EmDash's publish hooks don't carry the user, so the actor comes from the
// request context set in src/middleware.ts (src/lib/activityContext.ts).
// Publishes without one (scheduled publishing) are logged as "scheduled".
import { currentActivityActor, type ActivityActor } from '../lib/activityContext'

const ROLE_ADMIN = 50
export const PAGE = '/activity'
const PAGE_SIZE = 50

export type ActivityAction = 'publish' | 'unpublish'

export interface ActivityEntry {
  timestamp: string
  action: ActivityAction
  collection: string
  itemId: string
  item: string
  locale: string | null
  userId: string | null
  user: string
  channel: ActivityActor['channel'] | 'scheduled'
}

// Child profiles are named by slug only: titles stay out of the log.
export function activityEntry(action: ActivityAction, collection: string, content: Record<string, any>, actor: ActivityActor | undefined, now = new Date()): ActivityEntry {
  const data = (content.data ?? {}) as Record<string, unknown>
  const title = collection === 'children' ? undefined : [data.title, data.name, data.question, data.key].find((v) => typeof v === 'string' && v)
  const itemId = String(content.id ?? '')
  return {
    timestamp: now.toISOString(),
    action,
    collection,
    itemId,
    item: String(title ?? content.slug ?? itemId),
    locale: typeof content.locale === 'string' ? content.locale : null,
    userId: actor?.user?.id ?? null,
    user: actor?.user ? (actor.user.name ? `${actor.user.name} <${actor.user.email}>` : actor.user.email) : '—',
    channel: actor ? actor.channel : 'scheduled',
  }
}

const CHANNEL_LABEL: Record<ActivityEntry['channel'], string> = {
  mcp: 'AI assistant (MCP)',
  api: 'API token',
  admin: 'Admin',
  scheduled: 'Scheduled',
}

export function activityPage(entries: ActivityEntry[], nextCursor?: string) {
  return {
    blocks: [
      { type: 'header', text: 'Activity' },
      { type: 'context', text: 'Who published or unpublished content, and how. Newest first.' },
      { type: 'divider' },
      {
        type: 'table',
        block_id: 'activity-table',
        columns: [
          { key: 'time', label: 'When', format: 'relative_time' },
          { key: 'action', label: 'Action', format: 'badge' },
          { key: 'item', label: 'Item', format: 'text' },
          { key: 'collection', label: 'Collection', format: 'code' },
          { key: 'locale', label: 'Language', format: 'text' },
          { key: 'user', label: 'Who', format: 'text' },
          { key: 'channel', label: 'How', format: 'text' },
        ],
        rows: entries.map((e) => ({
          time: e.timestamp,
          action: e.action,
          item: e.item,
          collection: e.collection,
          locale: e.locale ?? '—',
          user: e.user,
          channel: CHANNEL_LABEL[e.channel] ?? e.channel,
        })),
        page_action_id: 'load-page',
        next_cursor: nextCursor,
        empty_text: 'Nothing published yet.',
      },
    ],
  }
}

const isEntry = (v: unknown): v is ActivityEntry =>
  !!v && typeof v === 'object' && typeof (v as ActivityEntry).timestamp === 'string' && typeof (v as ActivityEntry).action === 'string'

async function record(action: ActivityAction, event: { content: Record<string, unknown>; collection: string }, ctx: any) {
  const entry = activityEntry(action, event.collection, event.content, currentActivityActor())
  try {
    await ctx.storage.entries.put(`${Date.now()}-${entry.itemId}`, entry)
  } catch (error) {
    ctx.log.error('Failed to record activity', error)
  }
}

async function loadPage(ctx: any, cursor?: string) {
  const result = await ctx.storage.entries.query({ orderBy: { timestamp: 'desc' }, limit: PAGE_SIZE, cursor })
  const entries = result.items.map((i: { data: unknown }) => i.data).filter(isEntry)
  return activityPage(entries, result.hasMore ? result.cursor : undefined)
}

export default {
  hooks: {
    'content:afterPublish': { handler: (event: any, ctx: any) => record('publish', event, ctx) },
    'content:afterUnpublish': { handler: (event: any, ctx: any) => record('unpublish', event, ctx) },
  },
  routes: {
    admin: {
      handler: async (routeCtx: any, ctx: any) => {
        if ((routeCtx.user?.role ?? 0) < ROLE_ADMIN) {
          return { blocks: [{ type: 'context', text: 'Only administrators can see the activity log.' }] }
        }
        const input = routeCtx.input ?? {}
        if (input.type === 'page_load' && input.page === PAGE) return loadPage(ctx)
        if (input.type === 'block_action' && input.action_id === 'load-page') return loadPage(ctx, input.value)
        return { blocks: [] }
      },
    },
  },
}

