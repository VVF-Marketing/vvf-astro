// Safeguarding: the public seed and the Docker build context must never
// carry child media (openspec/changes/seed-postgres-with-media, design D4).
// The child checks run fully only where the gitignored child manifest exists.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHILD_MANIFEST_PATH, ROOT_DIR, mediaIdFor } from './seed-media.mjs'

const seedText = readFileSync(path.join(ROOT_DIR, 'seed/seed.json'), 'utf8')
const seed = JSON.parse(seedText)

function strings(value, out = new Set()) {
  if (typeof value === 'string') out.add(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

describe('public seed', () => {
  it('has no children and no child media paths', () => {
    expect(seed.content.children ?? []).toEqual([])
    expect(seedText).not.toContain('seed/media/children')
  })

  it.runIf(existsSync(CHILD_MANIFEST_PATH))('has no child media ID, file name or alt text', () => {
    const child = Object.values(JSON.parse(readFileSync(CHILD_MANIFEST_PATH, 'utf8')))
    const values = strings(seed)
    const publicManifest = JSON.parse(readFileSync(path.join(ROOT_DIR, 'seed/media/manifest.json'), 'utf8'))
    const publicAlts = new Set(Object.values(publicManifest).map((e) => e.alt))
    for (const entry of child) {
      expect(seedText).not.toContain(mediaIdFor(entry.path))
      expect(values).not.toContain(path.basename(entry.path))
      // An identical caption on a public image isn't a leak.
      if (entry.alt && !publicAlts.has(entry.alt)) expect(values).not.toContain(entry.alt)
    }
  })
})

describe('.dockerignore', () => {
  it('keeps child data out of the build context', () => {
    const lines = readFileSync(path.join(ROOT_DIR, '.dockerignore'), 'utf8').split('\n').map((l) => l.trim())
    for (const required of ['seed/seed.local.json', 'seed/media/children/', 'scripts/migrate/snapshot/']) expect(lines).toContain(required)
  })
})
