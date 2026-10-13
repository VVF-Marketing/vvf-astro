import { describe, expect, it } from 'vitest'
import { readiness } from './health'

const ok = async () => true
const fail = async () => {
  throw new Error('connection refused: postgres://user:secret@db')
}
const hang = () => new Promise(() => {})

describe('readiness', () => {
  it('is ready when the database and storage answer', async () => {
    expect(await readiness({ db: ok, storage: ok })).toEqual({ status: 200, body: { db: true, storage: true } })
  })

  it('is not ready when the database fails, without leaking the error', async () => {
    const r = await readiness({ db: fail, storage: ok })
    expect(r).toEqual({ status: 503, body: { db: false, storage: true } })
    expect(JSON.stringify(r)).not.toContain('secret')
  })

  it('is not ready when storage fails', async () => {
    expect((await readiness({ db: ok, storage: fail })).status).toBe(503)
  })

  it('times out a check that hangs', async () => {
    const r = await readiness({ db: ok, storage: hang }, 50)
    expect(r).toEqual({ status: 503, body: { db: true, storage: false } })
  })
})
