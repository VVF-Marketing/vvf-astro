import { describe, expect, it } from 'vitest'
import { backupName, main, parentClient, reset, takeSnapshot } from './preview-parent.mjs'

// A fake Neon API: `branches` is the list before the call; a restore adds the
// backup and moves main's children under it, as Neon does.
function fakeNeon(branches) {
  const calls = []
  let list = branches.map((b) => ({ ...b }))
  const fetch = async (url, { method, body }) => {
    const u = new URL(url)
    const path = u.pathname.replace('/api/v2/projects/proj', '')
    const data = body && JSON.parse(body)
    calls.push({ method, path, body: data })
    const json = (status, d) => ({ ok: status < 400, status, json: async () => d })
    if (method === 'GET' && path === '/branches') return json(200, { branches: list })
    if (method === 'POST' && path === '/branches') {
      list.push({ id: 'br-snap', name: data.branch.name, parent_id: list.find((b) => b.default).id })
      return json(201, { branch: { id: 'br-snap' } })
    }
    const restore = path.match(/^\/branches\/(.+)\/restore$/)
    if (method === 'POST' && restore) {
      list = list.map((b) => (b.parent_id === restore[1] ? { ...b, parent_id: 'br-backup' } : b))
      list.push({ id: 'br-backup', name: data.preserve_under_name, parent_id: null })
      return json(200, {})
    }
    if (method === 'DELETE') {
      list = list.filter((b) => `/branches/${b.id}` !== path)
      return json(200, {})
    }
    return json(404, {})
  }
  return { client: parentClient({ apiKey: 'neon-key', projectId: 'proj', fetch }), calls, fetch }
}

const MAIN = { id: 'br-main', name: 'main', default: true, parent_id: null }
const SNAP = { id: 'br-snap', name: 'seed-snapshot', parent_id: 'br-main' }
const NOW = new Date('2026-10-23T01:30:00.123Z')

describe('preview-parent', () => {
  it('takes seed-snapshot from the default branch, without an expiry', async () => {
    const { client, calls } = fakeNeon([MAIN])
    expect(await takeSnapshot(client)).toBe('br-snap')
    const post = calls.find((c) => c.method === 'POST')
    expect(post.body).toEqual({ branch: { name: 'seed-snapshot' } })
  })

  it("won't overwrite an existing snapshot", async () => {
    const { client, calls } = fakeNeon([MAIN, SNAP])
    await expect(takeSnapshot(client)).rejects.toThrow(/already exists/)
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('restores main from seed-snapshot, keeping a timestamped backup', async () => {
    const { client, calls } = fakeNeon([MAIN, SNAP, { id: 'br-pr', name: 'pr-7', parent_id: 'br-main' }])
    const r = await reset(client, { now: NOW })
    expect(r.backup).toBe('main-before-reset-20261023T013000Z')
    const restore = calls.find((c) => c.path.endsWith('/restore'))
    expect(restore.path).toBe('/branches/br-main/restore')
    expect(restore.body).toEqual({ source_branch_id: 'br-snap', preserve_under_name: 'main-before-reset-20261023T013000Z' })
  })

  it('deletes older backups with no children, never the new one or one still holding branches', async () => {
    const { client, calls } = fakeNeon([
      MAIN,
      SNAP,
      { id: 'br-old-empty', name: 'main-before-reset-20261001T000000Z', parent_id: null },
      { id: 'br-old-held', name: 'main-before-reset-20260901T000000Z', parent_id: null },
      { id: 'br-pr', name: 'pr-3', parent_id: 'br-old-held' },
    ])
    const r = await reset(client, { now: NOW })
    expect(r.pruned).toEqual(['main-before-reset-20261001T000000Z'])
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['/branches/br-old-empty'])
  })

  it('refuses to reset without a snapshot', async () => {
    const { client, calls } = fakeNeon([MAIN])
    await expect(reset(client)).rejects.toThrow(/No seed-snapshot/)
    expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(false)
  })

  it('names backups so they sort by time', () => {
    expect(backupName(new Date('2026-01-02T03:04:05.678Z'))).toBe('main-before-reset-20260102T030405Z')
  })

  it('rejects an unknown command', async () => {
    const { fetch } = fakeNeon([MAIN])
    await expect(main(['drop'], { NEON_API_KEY: 'k', NEON_PROJECT_ID: 'proj' }, { fetch, log: () => {} })).rejects.toThrow(/Usage/)
  })
})
