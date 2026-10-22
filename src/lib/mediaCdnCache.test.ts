import { describe, expect, it } from 'vitest'
import { MEDIA_CDN_CACHE_CONTROL, withMediaCdnCache } from './mediaCdnCache'

const file = (status = 200, headers: Record<string, string> = { 'Cache-Control': 'public, max-age=0, must-revalidate' }) => new Response('x', { status, headers })

describe('withMediaCdnCache', () => {
  it('caches a served media file briefly at the CDN, leaving the browser policy alone', () => {
    const res = withMediaCdnCache('/_emdash/api/media/file/01A.png', 'GET', file())
    expect(res.headers.get('Vercel-CDN-Cache-Control')).toBe(MEDIA_CDN_CACHE_CONTROL)
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    expect(withMediaCdnCache('/_emdash/api/media/file/01A.png', 'HEAD', file()).headers.get('Vercel-CDN-Cache-Control')).toBe(MEDIA_CDN_CACHE_CONTROL)
  })

  it('keeps the window short, so a removed photo stops being served within minutes', () => {
    expect(Number(/max-age=(\d+)/.exec(MEDIA_CDN_CACHE_CONTROL)?.[1])).toBeLessThanOrEqual(600)
  })

  it("never caches errors, other methods or other API routes", () => {
    for (const [path, method, res] of [
      ['/_emdash/api/media/file/backups/site.json', 'GET', file(404)],
      ['/_emdash/api/media/file/missing.png', 'GET', file(404)],
      ['/_emdash/api/media/file/01A.png', 'DELETE', file()],
      ['/_emdash/api/media', 'GET', file()],
      ['/_emdash/api/content/pages', 'GET', file()],
    ] as const) {
      expect(withMediaCdnCache(path, method, res).headers.has('Vercel-CDN-Cache-Control'), `${method} ${path}`).toBe(false)
    }
  })

  it('copies a response whose headers are immutable', async () => {
    const res = file()
    Object.defineProperty(res, 'headers', { value: Object.freeze(Object.assign(new Headers(res.headers), { set() { throw new TypeError('immutable') } })) })
    const out = withMediaCdnCache('/_emdash/api/media/file/01A.png', 'GET', res)
    expect(out.headers.get('Vercel-CDN-Cache-Control')).toBe(MEDIA_CDN_CACHE_CONTROL)
    expect(await out.text()).toBe('x')
  })
})
