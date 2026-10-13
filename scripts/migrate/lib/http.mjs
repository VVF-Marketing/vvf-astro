// Polite fetch helpers for the live Webflow site. Responses are cached on
// disk under scripts/migrate/.cache/ so re-runs don't re-crawl the site;
// pass { fresh: true } (or MIGRATE_FRESH=1) to bypass the cache.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { MIGRATE_DIR } from './paths.mjs'

const CACHE_DIR = path.join(MIGRATE_DIR, '.cache')
const DELAY_MS = 250
const USER_AGENT = 'vvf-astro-migration/1.0 (+https://github.com/anclist/vvf-astro)'

let lastRequestAt = 0

async function throttle() {
  const wait = lastRequestAt + DELAY_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()
}

function cachePath(url) {
  return path.join(CACHE_DIR, createHash('sha1').update(url).digest('hex'))
}

export async function fetchText(url, { fresh = process.env.MIGRATE_FRESH === '1', headers = {} } = {}) {
  const file = cachePath(url)
  if (!fresh && existsSync(file)) return readFileSync(file, 'utf8')
  const res = await fetchWithRetry(url, { headers: { 'user-agent': USER_AGENT, ...headers } })
  if (!res.ok) throw new HttpError(url, res.status)
  const text = await res.text()
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(file, text)
  return text
}

export async function fetchWithRetry(url, init = {}, attempts = 3) {
  let lastError
  for (let i = 0; i < attempts; i++) {
    await throttle()
    try {
      const res = await fetch(url, init)
      if (res.status < 500 && res.status !== 429) return res
      lastError = new HttpError(url, res.status)
    } catch (err) {
      lastError = err
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
  throw lastError
}

export class HttpError extends Error {
  constructor(url, status) {
    super(`HTTP ${status} for ${url}`)
    this.url = url
    this.status = status
  }
}
