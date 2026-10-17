import { describe, expect, it } from 'vitest'
import { reservedSlugError, writtenSlug } from './reservedSlugs'

describe('reserved article slugs (spec 2.2, check 2.8-8)', () => {
  it('refuses the Resources category slugs for articles only', () => {
    for (const slug of ['stories', 'financials', 'News']) expect(reservedSlugError('articles', slug)).toMatch(/category page/)
    expect(reservedSlugError('articles', 'impact-report-2025')).toBeUndefined()
    expect(reservedSlugError('events', 'news')).toBeUndefined()
  })

  it('reads the slug of REST and MCP writes', () => {
    expect(writtenSlug('/_emdash/api/content/articles', 'POST', { slug: 'news' })).toEqual({ collection: 'articles', slug: 'news' })
    expect(writtenSlug('/_emdash/api/content/articles/01ABC', 'PUT', { slug: 'stories' })).toEqual({ collection: 'articles', slug: 'stories' })
    expect(writtenSlug('/_emdash/api/content/articles', 'GET', {})).toBeUndefined()
    expect(
      writtenSlug('/_emdash/api/mcp', 'POST', { jsonrpc: '2.0', method: 'tools/call', params: { name: 'content_create', arguments: { collection: 'articles', slug: 'news' } } })
    ).toEqual({ collection: 'articles', slug: 'news' })
  })
})
