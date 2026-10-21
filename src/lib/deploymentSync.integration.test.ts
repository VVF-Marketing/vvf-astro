// Integration test for the once-per-deployment sync (openspec/changes/
// run-on-vercel-functions, task 5.1): five "instances" (separate connection
// pools) of one new deployment get their first request at the same moment,
// and the sync must run once, leaving one marker. Needs TEST_POSTGRES_URL
// (CI's container job); its vvf_static_page_sync table is dropped.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely, sql } from 'kysely'
import { createDialect } from 'emdash/db/postgres'
import { syncOncePerDeployment } from './deploymentSync'

const url = process.env.TEST_POSTGRES_URL
const INSTANCES = 5

describe.skipIf(!url)('syncOncePerDeployment on Postgres', () => {
  let dbs: Kysely<any>[] = []

  beforeAll(async () => {
    dbs = Array.from({ length: INSTANCES }, () => new Kysely<any>({ dialect: createDialect({ connectionString: url, pool: { max: 2 } }) }))
    await sql`drop table if exists vvf_static_page_sync`.execute(dbs[0])
  })

  afterAll(async () => {
    await sql`drop table if exists vvf_static_page_sync`.execute(dbs[0])
    await Promise.all(dbs.map((db) => db.destroy()))
  })

  const firstRequests = (deploymentId: string, onSync: () => void) =>
    Promise.all(
      dbs.map((db) =>
        syncOncePerDeployment({
          db,
          deploymentId,
          sync: async () => {
            onSync()
            await new Promise((r) => setTimeout(r, 300)) // a sync takes a while
            return 'synced'
          },
        })
      )
    )

  it('syncs once when every instance starts at once', async () => {
    let syncs = 0
    const outcomes = await firstRequests('dpl_1', () => syncs++)
    expect(syncs).toBe(1)
    expect(outcomes.filter((o) => o.ran)).toHaveLength(1)
    const { rows } = await sql<{ deployment_id: string }>`select deployment_id from vvf_static_page_sync`.execute(dbs[0])
    expect(rows).toEqual([{ deployment_id: 'dpl_1' }])
  })

  it('skips on later instances of the same deployment', async () => {
    let syncs = 0
    const outcomes = await firstRequests('dpl_1', () => syncs++)
    expect(syncs).toBe(0)
    // Each one sees the marker, or the lock briefly held by another reading it.
    expect(outcomes.every((o) => !o.ran)).toBe(true)
  })

  it('syncs once again for the next deployment', async () => {
    let syncs = 0
    await firstRequests('dpl_2', () => syncs++)
    expect(syncs).toBe(1)
    const { rows } = await sql<{ deployment_id: string }>`select deployment_id from vvf_static_page_sync`.execute(dbs[0])
    expect(rows).toEqual([{ deployment_id: 'dpl_2' }])
  })
})
