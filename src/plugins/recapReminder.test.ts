import { describe, expect, it } from 'vitest'
import plugin, { eventsAwaitingRecap, reminderBlocks, WIDGET_ID } from './recapReminder'

const now = new Date('2026-11-12T12:00:00Z')
const events = [
  { id: 'e1', data: { name: 'Golf 2026', start: '2026-11-09T00:00:00.000Z', lifecycle: 'upcoming', recap_headline: 'Thanks!' } },
  { id: 'e1es', locale: 'es', data: { name: 'Golf 2026', start: '2026-11-09T00:00:00.000Z', lifecycle: 'upcoming' } },
  { id: 'e2', data: { name: 'Golf 2025', start: '2025-11-10T00:00:00.000Z', lifecycle: 'past' } },
  { id: 'e3', data: { name: 'Gala 2027', start: '2027-03-01T00:00:00.000Z', lifecycle: 'upcoming' } },
]

describe('recap reminder', () => {
  it('lists English events past their date that are still upcoming, with empty recap fields', () => {
    expect(eventsAwaitingRecap(events, now)).toEqual([
      { id: 'e1', name: 'Golf 2026', start: '2026-11-09', missing: ['Recap summary', 'Amount raised', 'Stats', 'Gallery', 'Recap video'] },
    ])
  })

  it('says so when nothing is waiting', () => {
    expect(reminderBlocks([]).blocks[0]).toMatchObject({ type: 'context' })
  })

  it('answers the dashboard widget', async () => {
    const ctx = { content: { list: async () => ({ items: events }) } }
    const res = await plugin.routes.admin.handler({ input: { type: 'page_load', page: `widget:${WIDGET_ID}` } }, ctx)
    expect(res.blocks.length).toBeGreaterThan(0)
  })
})
