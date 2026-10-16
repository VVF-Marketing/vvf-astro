import { describe, expect, it } from 'vitest'
import { archiveItems, campaignsFrom } from './campaigns'

describe('campaignsFrom', () => {
  it('keeps slots with a known status and a title', () => {
    const copy = {
      'campaign1.status': 'Active',
      'campaign1.title': 'Earthquake relief',
      'campaign1.link': '/venezuela-earthquake-relief',
      'campaign2.status': 'completed',
      'campaign2.title': 'Christmas 2025',
      'campaign2.ended': '2025-12-31',
      'campaign3.status': 'paused',
      'campaign3.title': 'Unknown status',
      'campaign4.status': 'active',
      'campaign4.title': '',
    }
    const out = campaignsFrom(copy, [1, 2, 3, 4])
    expect(out.map((c) => [c.status, c.title])).toEqual([
      ['active', 'Earthquake relief'],
      ['completed', 'Christmas 2025'],
    ])
    expect(out[0].link).toBe('/venezuela-earthquake-relief')
  })
})

describe('archiveItems', () => {
  it('mixes past events and completed campaigns, newest first', () => {
    const events = [{ startDate: '2025-11-10T00:00:00.000Z', slug: 'golf-2025' }, { startDate: '2024-11-10T00:00:00.000Z', slug: 'golf-2024' }]
    const campaigns = [
      { status: 'completed' as const, title: 'Christmas 2025', ended: '2025-12-31' },
      { status: 'active' as const, title: 'Earthquake relief' },
    ]
    expect(archiveItems(events, campaigns).map((i) => (i.kind === 'event' ? i.event.slug : i.campaign.title))).toEqual(['Christmas 2025', 'golf-2025', 'golf-2024'])
  })
})
