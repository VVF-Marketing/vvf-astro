import { describe, expect, it } from 'vitest'
import { checkBranchName, deleteBranch, ensureBranch, expiryFrom, main, neonClient } from './neon-branch.mjs'

const POOLED = 'postgres://u:secret-pw@ep-x-pooler.neon.tech/neondb'
const DIRECT = 'postgres://u:secret-pw@ep-x.neon.tech/neondb'

// A fake Neon API that records calls.
function fakeNeon(branches = []) {
  const calls = []
  const fetch = async (url, { method, headers, body }) => {
    const u = new URL(url)
    calls.push({ method, path: u.pathname.replace('/api/v2/projects/proj', '') + u.search, body: body && JSON.parse(body), auth: headers.Authorization })
    const json = (status, data) => ({ ok: status < 400, status, json: async () => data })
    if (method === 'GET' && u.pathname.endsWith('/branches')) return json(200, { branches })
    if (method === 'POST') return json(201, { branch: { id: 'br-new', name: JSON.parse(body).branch.name } })
    if (method === 'PATCH') return json(200, {})
    if (method === 'DELETE') return json(200, {})
    if (u.pathname.endsWith('/connection_uri')) return json(200, { uri: u.searchParams.get('pooled') === 'true' ? POOLED : DIRECT })
    return json(404, {})
  }
  return { client: neonClient({ apiKey: 'neon-key', projectId: 'proj', fetch }), calls, fetch }
}

const NOW = new Date('2026-10-22T00:00:00Z')

describe('neon-branch', () => {
  it('creates pr-<n> from the default branch with a 14-day expiry', async () => {
    const { client, calls } = fakeNeon()
    const b = await ensureBranch(client, 'pr-12', { database: 'neondb', role: 'neondb_owner', now: NOW })
    expect(b).toMatchObject({ created: true, id: 'br-new', pooled: POOLED, direct: DIRECT, expiresAt: '2026-11-05T00:00:00.000Z' })
    const post = calls.find((c) => c.method === 'POST')
    expect(post.body).toEqual({ branch: { name: 'pr-12', expires_at: '2026-11-05T00:00:00.000Z' }, endpoints: [{ type: 'read_write' }] })
    expect(post.body.branch).not.toHaveProperty('parent_id')
    expect(calls.every((c) => c.auth === 'Bearer neon-key')).toBe(true)
  })

  it('renews an existing branch instead of creating another', async () => {
    const { client, calls } = fakeNeon([{ id: 'br-1', name: 'pr-12' }, { id: 'br-2', name: 'pr-123' }])
    const b = await ensureBranch(client, 'pr-12', { database: 'neondb', role: 'neondb_owner', now: NOW })
    expect(b).toMatchObject({ created: false, id: 'br-1' })
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/branches/br-1', body: { branch: { expires_at: expiryFrom(NOW) } } })
  })

  it('deletes only the exact branch, and is fine when it is already gone', async () => {
    const { client, calls } = fakeNeon([{ id: 'br-2', name: 'pr-123' }])
    expect(await deleteBranch(client, 'pr-12')).toBe(false)
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    const other = fakeNeon([{ id: 'br-1', name: 'pr-12' }])
    expect(await deleteBranch(other.client, 'pr-12')).toBe(true)
    expect(other.calls.find((c) => c.method === 'DELETE').path).toBe('/branches/br-1')
  })

  it('only touches branches named pr-<number>, never main', () => {
    for (const bad of ['main', 'pr-', 'pr-1;rm', undefined, 'production']) expect(() => checkBranchName(bad)).toThrow(/pr-<number>/)
    expect(checkBranchName('pr-7')).toBe('pr-7')
  })

  it('masks both connection strings and passes them on without printing them', async () => {
    const { fetch } = fakeNeon()
    const logs = [], envLines = []
    await main(['ensure', 'pr-12'], { NEON_API_KEY: 'k', NEON_PROJECT_ID: 'proj' }, { fetch, log: (l) => logs.push(l), writeEnv: (l) => envLines.push(l) })
    expect(logs.slice(0, 2)).toEqual([`::add-mask::${POOLED}`, `::add-mask::${DIRECT}`])
    expect(logs.slice(2).join('\n')).not.toContain('secret-pw')
    expect(envLines).toEqual([`DATABASE_URL=${POOLED}`, `DATABASE_URL_UNPOOLED=${DIRECT}`])
  })

  it('needs the key and project', () => {
    expect(() => neonClient({ projectId: 'p' })).toThrow(/NEON_API_KEY/)
  })
})
