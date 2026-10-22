import { describe, expect, it } from 'vitest'
import { checkSettings, main, namesFromEnvLs, parseArgs } from './check-settings.mjs'

const SECRET = 'postgres://user:super-secret-password@db.example/vvf'
// The shape `vercel env ls --json` prints; non-sensitive values can be readable.
const envLs = (keys) => JSON.stringify({ envs: keys.map((key) => ({ key, value: key === 'DATABASE_URL' ? SECRET : 'readable-value', type: 'encrypted', target: ['preview'] })) })
const ALL = ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'CRON_SECRET', 'EMDASH_SYNC_PAT']

function run(argv, keys) {
  const out = []
  const code = main(argv, { list: () => envLs(keys), log: (l) => out.push(l), error: (l) => out.push(l) })
  return { code, out: out.join('\n') }
}

describe('check-settings', () => {
  it('keeps only variable names from the CLI output', () => {
    expect(namesFromEnvLs(envLs(['A', 'B', 'A']))).toEqual(['A', 'B'])
    expect(namesFromEnvLs(JSON.stringify([{ key: 'C' }, {}]))).toEqual(['C'])
  })

  it("checks the deployed mode's requirements: Postgres, Blob and Vercel", () => {
    expect(checkSettings({ names: ALL })).toEqual([])
    expect(checkSettings({ names: [] })).toEqual(['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'CRON_SECRET', 'EMDASH_SYNC_PAT'])
  })

  it('counts the variables the deploy sets itself (--with)', () => {
    const keys = ALL.filter((k) => k !== 'DATABASE_URL')
    expect(run(['--environment', 'preview'], keys).code).toBe(1)
    expect(run(['--environment', 'preview', '--with', 'DATABASE_URL'], keys).code).toBe(0)
  })

  it('reports missing names and never prints a value', () => {
    const { code, out } = run(['--environment', 'production'], ['DATABASE_URL', 'CRON_SECRET'])
    expect(code).toBe(1)
    expect(out).toContain('Missing required settings in production: BLOB_READ_WRITE_TOKEN, EMDASH_SYNC_PAT')
    expect(out).not.toContain('super-secret-password')
    expect(out).not.toContain('readable-value')
    const ok = run(['--environment', 'production'], ALL)
    expect(ok.code).toBe(0)
    expect(ok.out).not.toContain('super-secret-password')
  })

  it('needs an environment', () => {
    expect(() => parseArgs([])).toThrow(/--environment/)
    expect(() => parseArgs(['--environment', 'development'])).toThrow(/production\|preview/)
  })
})
