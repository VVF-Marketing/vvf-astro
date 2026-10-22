import { describe, expect, it, vi } from 'vitest'
import { confirmTarget, shouldSeed } from './db-setup.mjs'

describe('shouldSeed', () => {
  it('seeds only an empty database unless forced', () => {
    expect(shouldSeed(0)).toBe(true)
    expect(shouldSeed(33)).toBe(false)
    expect(shouldSeed(33, true)).toBe(true)
  })
})

// Review finding (PR #25): seeding Postgres didn't say where it was writing.
describe('describeTarget', () => {
  it('names host, port and database without credentials', async () => {
    const { describeTarget } = await import('./db-setup.mjs')
    expect(describeTarget('postgres://vvf:secret@db.example.org:5432/vvf')).toBe('db.example.org:5432/vvf')
    expect(describeTarget('not a url')).toBe('(unparseable DATABASE_URL)')
  })
})

// Review finding (PR #26): without STORAGE=s3, setup put the seed media on
// the machine running it, and the deployed site showed broken images.
describe('openStorage', () => {
  it('needs STORAGE to be explicit', async () => {
    const { openStorage } = await import('./db-setup.mjs')
    expect(() => openStorage({})).toThrow(/STORAGE=s3/)
    expect(openStorage({ STORAGE: 'local' })).toBeDefined()
  })

  it('opens Blob with the token, and refuses without it', async () => {
    const { openStorage } = await import('./db-setup.mjs')
    expect(() => openStorage({ STORAGE: 'blob' })).toThrow(/BLOB_READ_WRITE_TOKEN/)
    expect(openStorage({ STORAGE: 'blob', BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test' }).token).toBe('vercel_blob_rw_test')
  })
})

// Review finding (PR #25, Step 24): db:setup read the target's fingerprint and
// passed it straight back to `emdash migrate`, so no one ever confirmed the
// target.
describe('confirmTarget', () => {
  const FP = 'a'.repeat(64)
  const quiet = { argv: [], env: {}, stdin: { isTTY: false } }
  const answering = (answer) => {
    const asked = []
    return { asked, confirmOptions: { argv: [], env: {}, ask: async (q) => (asked.push(q), answer) } }
  }

  it('accepts a matching pinned fingerprint without asking', async () => {
    const { asked, confirmOptions } = answering('n')
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, pinned: FP, confirmOptions })).toBe(true)
    expect(asked).toEqual([])
  })

  it('refuses a different database than the pinned one', async () => {
    await expect(confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, pinned: 'b'.repeat(64), confirmOptions: quiet })).rejects.toThrow("doesn't match")
  })

  it('asks in a terminal when nothing is pinned, naming the target', async () => {
    const no = answering('n')
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, confirmOptions: no.confirmOptions })).toBe(false)
    expect(no.asked[0]).toContain(`db:5432/vvf (fingerprint ${FP})`)
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, confirmOptions: answering('y').confirmOptions })).toBe(true)
  })

  it('refuses unattended runs without a pin, --yes or CI', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, confirmOptions: quiet })).toBe(false)
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, confirmOptions: { ...quiet, argv: ['--yes'] } })).toBe(true)
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, confirmOptions: { ...quiet, env: { CI: 'true' } } })).toBe(true)
  })

  it('still asks before --force overwrites content, even when pinned', async () => {
    const { asked, confirmOptions } = answering('y')
    expect(await confirmTarget({ target: 'db:5432/vvf', fingerprint: FP, pinned: FP, force: true, confirmOptions })).toBe(true)
    expect(asked[0]).toContain('--force')
  })
})
