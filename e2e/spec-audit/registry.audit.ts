// The registry must list every numbered check of the spec version it names,
// exactly once. Reads the local (gitignored) spec copy; skips without it.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CHECKS, SPEC_VERSION } from './registry'

const specPath = fileURLToPath(new URL(`../../.spec-audit/spec-v${SPEC_VERSION}.md`, import.meta.url))
const hasSpec = existsSync(specPath)

// Numbered items under "### x.y Checks", a page's "**Checks.**" block, and
// the 4.4 migration content checks.
export function specCheckIds(markdown: string): string[] {
  const ids: string[] = []
  let current: string | undefined
  let section: string | undefined
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^### (\d+\.\d+) (.*)/)
    if (heading) {
      current = heading[1]
      section = heading[2] === 'Checks' ? current : undefined
      continue
    }
    if (/^#{1,4} /.test(line)) section = undefined
    else if (line === '**Checks.**') section = current
    else if (line === '**Content checks during migration.**') section = '4.4'
    else if (line.startsWith('**')) section = undefined
    else if (section) {
      const item = line.match(/^(\d+)\. /)
      if (item) ids.push(`${section}-${item[1]}`)
    }
  }
  return ids
}

describe.skipIf(!hasSpec)(`registry matches spec v${SPEC_VERSION}`, () => {
  it('lists every spec check exactly once', () => {
    const fromSpec = specCheckIds(readFileSync(specPath, 'utf8'))
    const fromRegistry = CHECKS.map((c) => c.id)
    expect(new Set(fromRegistry).size).toBe(fromRegistry.length)
    expect([...fromRegistry].sort()).toEqual([...fromSpec].sort())
  })
})

describe('registry entries', () => {
  it('give a file for auto checks and a reason for the rest', () => {
    for (const c of CHECKS) {
      if (c.verify === 'auto') expect(c.file, c.id).toBeTruthy()
      else expect(c.reason, c.id).toBeTruthy()
    }
  })
})

if (!hasSpec) console.warn(`[spec-audit] .spec-audit/spec-v${SPEC_VERSION}.md not found; registry completeness check skipped`)
