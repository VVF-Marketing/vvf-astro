import { describe, expect, it, vi } from 'vitest'
import { syncOncePerDeployment } from './deploymentSync'

// `sql` templates run through trx.getExecutor().executeQuery (mocked below):
// a fake Postgres answering the lock, the marker read and the upsert.
vi.mock('kysely', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    execute: (trx: { getExecutor: () => { executeQuery: (q: { sql: string; values: unknown[] }) => unknown } }) =>
      trx.getExecutor().executeQuery({ sql: strings.join('?').trim(), values }),
  }),
}))

function fakeDb({ locked = true, marker }: { locked?: boolean; marker?: string } = {}) {
  const state = { marker, queries: [] as string[] }
  const executeQuery = async ({ sql, values }: { sql: string; values: unknown[] }) => {
    state.queries.push(sql)
    if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ locked }] }
    if (sql.startsWith('select deployment_id')) return { rows: state.marker ? [{ deployment_id: state.marker }] : [] }
    if (sql.startsWith('insert into vvf_static_page_sync')) state.marker = values[0] as string
    return { rows: [] }
  }
  const trx = { getExecutor: () => ({ executeQuery }) }
  const db = { transaction: () => ({ execute: (fn: (t: unknown) => unknown) => fn(trx) }) }
  return { db: db as never, state }
}

describe('syncOncePerDeployment', () => {
  it('syncs without coordination on SQLite (no Postgres db)', async () => {
    const sync = vi.fn(async () => 'done')
    expect(await syncOncePerDeployment({ deploymentId: 'd1', sync })).toEqual({ ran: true, result: 'done' })
    expect(sync).toHaveBeenCalledOnce()
  })

  it('syncs and records the deployment', async () => {
    const { db, state } = fakeDb()
    const sync = vi.fn(async () => 'done')
    expect(await syncOncePerDeployment({ db, deploymentId: 'd1', sync })).toEqual({ ran: true, result: 'done' })
    expect(state.marker).toBe('d1')
  })

  it('skips when this deployment already synced', async () => {
    const { db } = fakeDb({ marker: 'd1' })
    const sync = vi.fn()
    expect(await syncOncePerDeployment({ db, deploymentId: 'd1', sync })).toEqual({ ran: false, reason: 'already-synced' })
    expect(sync).not.toHaveBeenCalled()
  })

  it('syncs a new deployment over an old marker', async () => {
    const { db, state } = fakeDb({ marker: 'd0' })
    expect((await syncOncePerDeployment({ db, deploymentId: 'd1', sync: async () => 1 })).ran).toBe(true)
    expect(state.marker).toBe('d1')
  })

  it('skips when another instance holds the lock', async () => {
    const { db, state } = fakeDb({ locked: false })
    const sync = vi.fn()
    expect(await syncOncePerDeployment({ db, deploymentId: 'd1', sync })).toEqual({ ran: false, reason: 'busy' })
    expect(sync).not.toHaveBeenCalled()
    expect(state.queries).toHaveLength(1)
  })

  it('syncs again when forced (the pipeline trigger)', async () => {
    const { db } = fakeDb({ marker: 'd1' })
    const sync = vi.fn(async () => 'again')
    expect(await syncOncePerDeployment({ db, deploymentId: 'd1', sync, force: true })).toEqual({ ran: true, result: 'again' })
  })
})
