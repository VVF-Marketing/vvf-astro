import { describe, expect, it } from 'vitest'
import { headerInterceptor } from '../staticPageSync'
import { protectionBypassHeaders } from './protectionBypass'

describe('protectionBypassHeaders', () => {
  it('sends the bypass header only when the secret is set', () => {
    expect(protectionBypassHeaders('s3cret')).toEqual({ 'x-vercel-protection-bypass': 's3cret' })
    expect(protectionBypassHeaders(undefined)).toBeUndefined()
    expect(protectionBypassHeaders('')).toBeUndefined()
  })

  it("reaches the CMS client's requests", async () => {
    let seen: Request | undefined
    const intercept = headerInterceptor(protectionBypassHeaders('s3cret')!)
    await intercept(new Request('https://preview.example/_emdash/api/content/pages', { headers: { Authorization: 'Bearer t' } }), async (r) => {
      seen = r
      return new Response('{}')
    })
    expect(seen?.headers.get('x-vercel-protection-bypass')).toBe('s3cret')
    expect(seen?.headers.get('Authorization')).toBe('Bearer t')
  })
})
