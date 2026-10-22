import { describe, expect, it } from 'vitest'
import { bypassHeaders, main, syncStaticPages, waitForReady } from './ready-and-sync.mjs'

const BASE = 'https://vvf-astro-preview-abc.vercel.app'

// Answers each path from a list of statuses, recording the requests.
function fakeSite(answers) {
  const requests = []
  const fetch = async (url, init = {}) => {
    const path = new URL(url).pathname
    requests.push({ path, method: init.method ?? 'GET', headers: init.headers ?? {} })
    const next = answers[path].shift()
    if (next instanceof Error) throw next
    return { status: next, json: async () => ({ created: 0, updated: 44 }) }
  }
  return { fetch, requests }
}

// A clock that moves forward on every wait, so tests don't sleep.
function clock() {
  let t = 0
  return { now: () => t, wait: async (ms) => void (t += ms) }
}

describe('ready-and-sync', () => {
  it('waits through a cold start until /readyz is 200', async () => {
    const site = fakeSite({ '/readyz': [503, Object.assign(new Error('x'), { code: 'ECONNRESET' }), 200] })
    expect(await waitForReady(BASE, { fetch: site.fetch, ...clock() })).toBe(true)
    expect(site.requests).toHaveLength(3)
  })

  it('fails when the deployment never becomes ready', async () => {
    const site = fakeSite({ '/readyz': Array(100).fill(503) })
    await expect(waitForReady(BASE, { fetch: site.fetch, ...clock(), timeoutMs: 20_000 })).rejects.toThrow(/wasn't ready within 20 s \(last: 503\)/)
  })

  it('retries the sync while another instance holds it (202), until 200', async () => {
    const site = fakeSite({ '/api/internal/sync-static-pages': [202, 202, 200] })
    expect(await syncStaticPages(BASE, { token: 'pat', fetch: site.fetch, ...clock() })).toEqual({ created: 0, updated: 44 })
    expect(site.requests.every((r) => r.method === 'POST' && r.headers.Authorization === 'Bearer pat')).toBe(true)
  })

  it('fails on any other answer, or when the sync stays busy', async () => {
    await expect(syncStaticPages(BASE, { token: 'pat', fetch: fakeSite({ '/api/internal/sync-static-pages': [401] }).fetch, ...clock() })).rejects.toThrow(/answered 401/)
    const busy = fakeSite({ '/api/internal/sync-static-pages': Array(100).fill(202) })
    await expect(syncStaticPages(BASE, { token: 'pat', fetch: busy.fetch, ...clock(), timeoutMs: 15_000 })).rejects.toThrow(/still busy/)
    await expect(syncStaticPages(BASE, { fetch: busy.fetch })).rejects.toThrow(/EMDASH_SYNC_PAT/)
  })

  it('sends the protection bypass header when set, and never logs secrets', async () => {
    expect(bypassHeaders({})).toEqual({})
    const site = fakeSite({ '/readyz': [200], '/api/internal/sync-static-pages': [200] })
    const logs = []
    await main([BASE], { EMDASH_SYNC_PAT: 'pat-secret', VERCEL_AUTOMATION_BYPASS_SECRET: 'bypass-secret' }, { fetch: site.fetch, ...clock(), log: (l) => logs.push(l) })
    expect(site.requests.every((r) => r.headers['x-vercel-protection-bypass'] === 'bypass-secret')).toBe(true)
    expect(logs.join('\n')).not.toMatch(/pat-secret|bypass-secret/)
  })

  it('needs an https deployment URL', async () => {
    await expect(main(['vvf.vercel.app'], {})).rejects.toThrow(/Usage/)
  })
})
