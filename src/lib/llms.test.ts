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

  it('links an external report where it is published, not to a page here', () => {
    const out = buildLlmsTxt({ site, upcoming: [], faqs: [], reports: [{ slug: 'form-990', title: 'Form 990', external: true, externalUrl: 'https://projects.propublica.org/nonprofits/990' }] })
    expect(out).toContain('- [Form 990](https://projects.propublica.org/nonprofits/990)')
    expect(out).not.toContain('/resources/form-990')
  })

  it('only promises the same Spanish path for the key pages', () => {
    expect(text).not.toContain('Every page above exists in Spanish')
    expect(text).toContain('The key pages exist in Spanish under /es, with the same path.')
  })

  it('leaves out empty sections', () => {
    const bare = buildLlmsTxt({ site, upcoming: [], reports: [], faqs: [] })
    expect(bare).not.toContain('## Upcoming events')
    expect(bare).not.toContain('## Latest reports')
    expect(bare).not.toContain('## Common questions')
    expect(bare).toContain('## Key pages')
  })
})
