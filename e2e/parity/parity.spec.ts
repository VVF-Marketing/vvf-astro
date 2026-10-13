import { mkdirSync, writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import sharp from 'sharp'
// @ts-expect-error -- plain ESM module shared with astro.config.mjs
import { projectPathFor } from '../../src/lib/legacyRoutes.mjs'

const LIVE = process.env.LIVE_BASE_URL ?? 'https://www.victoriavenezuelafoundation.org'
const OUT = 'test-results/parity'
const WIDTHS = [1440, 390]

// Every migrated page, by its live path (child/team/resource/event detail
// pages are represented by one example each).
const LIVE_PAGES = [
  '/',
  '/ways-to-give',
  '/sponsor-a-child',
  '/sponsor-a-child-list-page',
  '/corporate-sponsorships',
  '/all-events',
  '/events/2026-golf-tournament',
  '/events/2025-golf-tournament',
  '/our-team',
  '/team-members/randy-lander',
  '/contact',
  '/venezuela-earthquake-relief',
  '/privacy-policy',
  '/resources-categories/all',
  '/resources-categories/financials-transparency',
  '/resources/impact-report-2025',
]

async function capture(page: Page, url: string, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
  // Scroll through once so lazy images load, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)
  return page.screenshot({ fullPage: true })
}

// Pads both screenshots to the same size and returns a difference image
// plus the share of pixels that differ noticeably.
async function diff(a: Buffer, b: Buffer) {
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()])
  const width = Math.max(ma.width!, mb.width!)
  const height = Math.max(ma.height!, mb.height!)
  const canvas = (buf: Buffer) =>
    sharp({ create: { width, height, channels: 4, background: '#ffffff' } }).composite([{ input: buf, left: 0, top: 0 }]).raw().toBuffer()
  const [ra, rb] = await Promise.all([canvas(a), canvas(b)])
  const out = Buffer.alloc(ra.length)
  let changed = 0
  for (let i = 0; i < ra.length; i += 4) {
    const d = Math.abs(ra[i] - rb[i]) + Math.abs(ra[i + 1] - rb[i + 1]) + Math.abs(ra[i + 2] - rb[i + 2])
    const hit = d > 60
    if (hit) changed++
    out[i] = hit ? 255 : ra[i] * 0.25 + 190
    out[i + 1] = hit ? 0 : ra[i + 1] * 0.25 + 190
    out[i + 2] = hit ? 80 : ra[i + 2] * 0.25 + 190
    out[i + 3] = 255
  }
  const png = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { png, ratio: changed / (width * height), width, height }
}

const summary: string[] = []

// Each page in both locales: Spanish pages live under /es on both sites.
const PAIRS = LIVE_PAGES.flatMap((p) => {
  const local = projectPathFor(p)
  return [
    [p, local],
    [p === '/' ? '/es' : `/es${p}`, local === '/' ? '/es' : `/es${local}`],
  ]
})

for (const [livePath, localPath] of PAIRS) {
  const name = (localPath === '/' ? 'home' : localPath.slice(1)).replace(/\//g, '__')

  test(`${livePath} → ${localPath}`, async ({ page, baseURL }) => {
    mkdirSync(OUT, { recursive: true })
    for (const width of WIDTHS) {
      const live = await capture(page, `${LIVE}${livePath}`, width)
      const local = await capture(page, `${baseURL}${localPath}`, width)
      writeFileSync(`${OUT}/${name}-${width}-live.png`, live)
      writeFileSync(`${OUT}/${name}-${width}-local.png`, local)
      const { png, ratio, height } = await diff(live, local)
      writeFileSync(`${OUT}/${name}-${width}-diff.png`, png)
      const line = `${localPath} @${width}px: ${(ratio * 100).toFixed(1)}% pixels differ (height ${height}px)`
      summary.push(line)
      test.info().annotations.push({ type: 'parity', description: line })
    }
  })
}

test.afterAll(() => {
  if (summary.length) writeFileSync(`${OUT}/summary.txt`, `${summary.sort().join('\n')}\n`)
})
