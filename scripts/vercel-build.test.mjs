// Checks a Vercel build's output (openspec/changes/run-on-vercel-functions,
// design D0/D3/D4/D7). Runs only after `DEPLOY_TARGET=vercel npx astro build`
// has written .vercel/output (the CI container job does); skipped otherwise.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DYNAMIC_REDIRECTS, STATIC_REDIRECTS, redirectStatus } from '../src/lib/legacyRoutes.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(ROOT, '.vercel/output')
const built = existsSync(path.join(OUTPUT, 'config.json'))

const FUNCTION_LIMIT_BYTES = 250 * 1024 * 1024

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isSymbolicLink()) return []
    return e.isDirectory() ? files(p) : [p]
  })
}

// A concrete URL for a redirect source: [param] → one segment, [...rest] → two.
const samplePath = (from) => from.replace(/\[\.\.\.[^\]]+\]/g, 'a/b').replace(/\[[^\]]+\]/g, 'a')
const expectedDestination = (from, to) => {
  const sample = samplePath(from).split('/')
  const params = {}
  from.split('/').forEach((seg, i) => {
    const rest = seg.match(/^\[\.\.\.(.+)\]$/)
    const one = seg.match(/^\[(.+)\]$/)
    if (rest) params[rest[1]] = sample.slice(i, i + 2).join('/')
    else if (one) params[one[1]] = sample[i]
  })
  return to.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (_, name) => params[name])
}

describe.skipIf(!built)('Vercel build output', () => {
  const functionsDir = path.join(OUTPUT, 'functions')
  const functions = built ? readdirSync(functionsDir).filter((d) => d.endsWith('.func')) : []
  const config = built ? JSON.parse(readFileSync(path.join(OUTPUT, 'config.json'), 'utf8')) : { routes: [] }

  it('is one Node.js function under the size limit', () => {
    expect(functions).toHaveLength(1)
    const dir = path.join(functionsDir, functions[0])
    const vc = JSON.parse(readFileSync(path.join(dir, '.vc-config.json'), 'utf8'))
    expect(vc.runtime).toMatch(/^nodejs/)
    const size = files(dir).reduce((sum, f) => sum + statSync(f).size, 0)
    expect(size).toBeLessThan(FUNCTION_LIMIT_BYTES)
  })

  it("turns off EmDash's in-process scheduler and uses Vercel's waitUntil", () => {
    const server = path.join(functionsDir, functions[0], 'dist/server')
    const code = files(server).filter((f) => f.endsWith('.mjs')).map((f) => readFileSync(f, 'utf8'))
    expect(code.some((c) => c.includes('createScheduler: null'))).toBe(true)
    expect(code.some((c) => /new NodeCronScheduler\(/.test(c))).toBe(false)
    expect(code.some((c) => /export \{ waitUntil \} from "@vercel\/functions"/.test(c))).toBe(true)
  })

  it('keeps every legacy redirect with its status and destination', () => {
    for (const [from, to] of Object.entries({ ...STATIC_REDIRECTS, ...DYNAMIC_REDIRECTS })) {
      const url = samplePath(from)
      const route = config.routes.find((r) => r.src && new RegExp(r.src).test(url))
      expect(route, from).toBeDefined()
      const groups = url.match(new RegExp(route.src)).slice(1)
      const location = route.headers?.Location?.replace(/\$(\d+)/g, (_, n) => groups[n - 1] ?? '')
      expect({ from, status: route.status, location }).toEqual({ from, status: redirectStatus(from), location: expectedDestination(from, to) })
    }
  })
})
