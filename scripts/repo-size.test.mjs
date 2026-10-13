// Binary size guard (review finding on PR #12: ~50 MB of media committed
// without Git LFS). The decision was to keep media in git while it stays
// small; this fails before it stops being small, so the choice is revisited
// on purpose (compress the file, or move media to LFS / object storage)
// rather than discovered later in clone times.
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BINARY = /\.(png|jpe?g|webp|gif|avif|pdf|mp4|webm|mov|zip|gz|woff2?|ttf|otf|ico)$/i
const MAX_FILE_MB = 8
const MAX_TOTAL_MB = 80

let files = []
try {
  files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => BINARY.test(f))
} catch {
  // Not a git checkout (e.g. a source archive): nothing to check.
}
const sizes = files.map((f) => {
  try {
    return [f, statSync(path.join(ROOT, f)).size]
  } catch {
    return [f, 0] // deleted in the working tree
  }
})
const mb = (n) => n / 1024 / 1024

describe.runIf(files.length > 0)('committed binaries', () => {
  it(`keeps every file under ${MAX_FILE_MB} MB`, () => {
    expect(sizes.filter(([, s]) => mb(s) > MAX_FILE_MB).map(([f, s]) => `${f} (${mb(s).toFixed(1)} MB)`)).toEqual([])
  })

  it(`keeps the total under ${MAX_TOTAL_MB} MB`, () => {
    expect(mb(sizes.reduce((t, [, s]) => t + s, 0))).toBeLessThan(MAX_TOTAL_MB)
  })
})
