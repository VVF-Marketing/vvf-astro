import { describe, expect, it } from 'vitest'
import { buildLlmsTxt, KEY_PAGES } from './llms'

const site = 'https://www.victoriavenezuelafoundation.org'

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt({
    site,
    upcoming: [{ slug: 'golf-2026', title: '2026 Golf Tournament', startDate: '2026-11-09T00:00:00.000Z', location: 'Weston, FL', summary: 'Every swing\nchanges a life.' }],
    reports: [{ slug: 'impact-report-2025', title: 'Impact Report 2025', publishedAt: '2026-01-15' }],
    faqs: [{ question: 'How much does it cost?', answer: '$25 a month.' }],
  })

  it('lists every key page in English and in Spanish', () => {
    for (const p of KEY_PAGES) {
      expect(text).toContain(`(${site}${p.path})`)
      expect(text).toContain(`(${site}${p.path === '/' ? '/es' : `/es${p.path}`})`)
    }
  })

  it('lists upcoming events with their date and page, on one line', () => {
    expect(text).toContain(`- [2026 Golf Tournament](${site}/events/golf-2026): 2026-11-09, Weston, FL. Every swing changes a life.`)
  })

  it('lists the latest reports and the common questions', () => {
    expect(text).toContain(`- [Impact Report 2025](${site}/resources/impact-report-2025): 2026-01-15`)
    expect(text).toContain('- **How much does it cost?** $25 a month.')
  })

  it('leaves out empty sections', () => {
    const bare = buildLlmsTxt({ site, upcoming: [], reports: [], faqs: [] })
    expect(bare).not.toContain('## Upcoming events')
    expect(bare).not.toContain('## Latest reports')
    expect(bare).not.toContain('## Common questions')
    expect(bare).toContain('## Key pages')
  })
})
