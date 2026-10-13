// The committed seed must be self-consistent: every `$ref:` points at an
// entry that exists (review finding on PR #15: Spanish golf events referenced
// a sponsor that wasn't in the seed).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const seed = JSON.parse(readFileSync(new URL('../seed/seed.json', import.meta.url), 'utf8'))

describe('seed/seed.json', () => {
  it('has no dangling references', () => {
    const ids = new Set(Object.values(seed.content ?? {}).flatMap((entries) => entries.map((e) => e.id)))
    const refs = [...JSON.stringify(seed.content).matchAll(/"\$ref:([^"]+)"/g)].map((m) => m[1])
    expect(refs.filter((r) => !ids.has(r))).toEqual([])
  })
})
