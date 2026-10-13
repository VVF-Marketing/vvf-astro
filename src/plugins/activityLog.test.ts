import { describe, expect, it } from 'vitest'
import plugin, { activityEntry, activityPage, PAGE } from './activityLog'
import { activityChannel, runWithActivityActor } from '../lib/activityContext'

const now = new Date('2026-10-10T12:00:00Z')
const marketer = { user: { id: 'u1', email: 'm@example.org', name: 'Marta' }, channel: 'mcp' as const }

describe('activity entries', () => {
  it('records who, how, what and in which language', () => {
    const entry = activityEntry('publish', 'events', { id: 'e1', slug: 'gala', locale: 'es', data: { title: 'Gala 2026' } }, marketer, now)
    expect(entry).toEqual({
      timestamp: '2026-10-10T12:00:00.000Z',
      action: 'publish',
      collection: 'events',
      itemId: 'e1',
      item: 'Gala 2026',
      locale: 'es',
      userId: 'u1',
      user: 'Marta <m@example.org>',
      channel: 'mcp',
    })
  })

  it('logs publishes without a request user as scheduled', () => {
    expect(activityEntry('publish', 'faqs', { id: 'f1', data: {} }, undefined, now)).toMatchObject({ userId: null, user: '—', channel: 'scheduled', item: 'f1' })
  })

  it('names child profiles by slug only', () => {
    const entry = activityEntry('unpublish', 'children', { id: 'c1', slug: 'ana', data: { title: 'Ana', private_full_name: 'Ana P.' } }, marketer, now)
    expect(entry.item).toBe('ana')
    expect(JSON.stringify(entry)).not.toContain('Ana P.')
  })
})

describe('channel', () => {
  it('tells MCP, API tokens and admin sessions apart', () => {
    expect(activityChannel('/_emdash/api/mcp', new Headers({ authorization: 'Bearer t' }))).toBe('mcp')
    expect(activityChannel('/_emdash/api/content/faqs/f1/publish', new Headers({ authorization: 'Bearer t' }))).toBe('api')
    expect(activityChannel('/_emdash/api/content/faqs/f1/publish', new Headers({ cookie: 'session=x' }))).toBe('admin')
  })
})

describe('hooks', () => {
  const store = () => {
    const saved: unknown[] = []
    return { saved, ctx: { storage: { entries: { put: async (_: string, v: unknown) => void saved.push(v) } }, log: { error() {} } } }
  }

  it('read the request actor from a deferred hook, as EmDash runs them', async () => {
    const { saved, ctx } = store()
    let deferred: Promise<unknown> = Promise.resolve()
    runWithActivityActor(marketer, () => {
      // EmDash's after(): Promise.resolve().then(fn), started inside the request.
      deferred = Promise.resolve().then(() => plugin.hooks['content:afterPublish'].handler({ collection: 'faqs', content: { id: 'f1', data: {} } }, ctx))
    })
    await deferred
    expect(saved).toMatchObject([{ action: 'publish', userId: 'u1', channel: 'mcp' }])
  })
})

describe('admin page', () => {
  const ctx = {
    storage: {
      entries: {
        query: async () => ({ items: [{ data: activityEntry('publish', 'events', { id: 'e1', data: { title: 'Gala' } }, marketer, now) }], hasMore: false }),
      },
    },
  }
  const load = (role: number) => plugin.routes.admin.handler({ user: { role }, input: { type: 'page_load', page: PAGE } }, ctx)

  it('lists entries for admins', async () => {
    const page = (await load(50)) as ReturnType<typeof activityPage>
    expect(page.blocks.find((b) => b.type === 'table')).toMatchObject({ rows: [{ item: 'Gala', user: 'Marta <m@example.org>', channel: 'AI assistant (MCP)' }] })
  })

  it('is refused below admin', async () => {
    expect(JSON.stringify(await load(40))).toContain('Only administrators')
  })
})
