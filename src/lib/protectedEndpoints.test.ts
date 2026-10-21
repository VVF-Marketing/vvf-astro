import { describe, expect, it, vi } from 'vitest'
import { bearerMatches, handleCron, handleSync } from './protectedEndpoints'

const call = (authorization?: string) => new Request('https://site.example/api/x', { headers: authorization ? { authorization } : {} })

describe('bearerMatches', () => {
  it('accepts only the exact secret', () => {
    expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true)
    expect(bearerMatches('Bearer s3cre', 's3cret')).toBe(false)
    expect(bearerMatches('s3cret', 's3cret')).toBe(false)
    expect(bearerMatches(null, 's3cret')).toBe(false)
  })

  it('refuses everyone when no secret is configured', () => {
    expect(bearerMatches('Bearer ', undefined)).toBe(false)
    expect(bearerMatches('Bearer ', '')).toBe(false)
  })
})

describe('handleCron', () => {
  it('refuses callers without the secret, and runs nothing', async () => {
    const run = vi.fn()
    expect((await handleCron(call(), { secret: 's', run })).status).toBe(401)
    expect((await handleCron(call('Bearer wrong'), { secret: 's', run })).status).toBe(401)
    expect(run).not.toHaveBeenCalled()
  })

  it('runs the scheduled tasks once with the secret', async () => {
    const run = vi.fn(async () => ({ published: [] }))
    const response = await handleCron(call('Bearer s'), { secret: 's', run })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ ok: true })
    expect(run).toHaveBeenCalledOnce()
  })

  it('answers 500 without detail when the tasks fail', async () => {
    const log = vi.fn()
    const run = async () => {
      throw new TypeError('connect ECONNREFUSED postgres://user:pw@db')
    }
    const response = await handleCron(call('Bearer s'), { secret: 's', run, log })
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('postgres')
    expect(log).toHaveBeenCalledWith('[cron] scheduled tasks failed: TypeError')
  })
})

describe('handleSync', () => {
  it('refuses callers without the sync token', async () => {
    const run = vi.fn()
    expect((await handleSync(call('Bearer x'), { secret: 'pat', run })).status).toBe(401)
    expect(run).not.toHaveBeenCalled()
  })

  it('returns the counts after syncing', async () => {
    const run = async () => ({ ran: true as const, result: { created: 2, updated: 5 } })
    const response = await handleSync(call('Bearer pat'), { secret: 'pat', run })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ran: true, created: 2, updated: 5 })
  })

  it('answers 202 when another instance is syncing', async () => {
    const run = async () => ({ ran: false as const, reason: 'busy' as const })
    const response = await handleSync(call('Bearer pat'), { secret: 'pat', run })
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ ran: false, reason: 'busy' })
  })
})
