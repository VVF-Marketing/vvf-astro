import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectAssets, download, harvestPlan, localFileName, manifestPaths, planAssets, pruneUnreferenced, s3Mirror } from './harvest.mjs'

const CDN = 'https://cdn.prod.website-files.com/site'

describe('localFileName', () => {
  it('drops Webflow id prefixes, decodes and keeps extension', () => {
    const name = localFileName(`${CDN}/6aaad34240b27e7dec42a871_6aaad2b1708aeb94d61dc9b0_Randy%2520Lander.webp`)
    expect(name).toMatch(/^[0-9a-f]{8}-randy-lander\.webp$/)
  })

  it('is stable for the same URL and unique across URLs', () => {
    expect(localFileName(`${CDN}/a.png`)).toBe(localFileName(`${CDN}/a.png`))
    expect(localFileName(`${CDN}/x/a.png`)).not.toBe(localFileName(`${CDN}/y/a.png`))
  })
})

describe('collectAssets', () => {
  it('finds { src, alt } objects, bare URLs and URLs inside rich text', () => {
    const found = [
      ...collectAssets({
        photo: { src: `${CDN}/p.jpg`, alt: 'P' },
        file: `${CDN}/f.pdf`,
        bodyHtml: `<p><img src="${CDN}/inline.png"></p>`,
        other: 'https://example.com/not-webflow.png',
      }),
    ]
    expect(found).toEqual([{ url: `${CDN}/p.jpg`, alt: 'P' }, { url: `${CDN}/f.pdf` }, { url: `${CDN}/inline.png` }])
  })
})

describe('planAssets', () => {
  it('routes child media to the gitignored children dir even when a page reuses it', () => {
    const plan = planAssets({
      children: { items: [{ photo: { src: `${CDN}/kid.jpg` } }] },
      pages: { home: { sections: [{ blocks: [{ type: 'image', src: `${CDN}/kid.jpg` }, { type: 'image', src: `${CDN}/hero.jpg` }] }] } },
    })
    expect(plan.get(`${CDN}/kid.jpg`)).toMatchObject({ dir: 'seed/media/children', manifest: 'children' })
    expect(plan.get(`${CDN}/hero.jpg`)).toMatchObject({ dir: 'public/images/pages', manifest: 'main' })
  })
})

describe('harvestPlan', () => {
  const plan = new Map([
    [`${CDN}/ok.jpg`, { dir: 'seed/media/events', alt: 'OK', manifest: 'main' }],
    [`${CDN}/missing.jpg`, { dir: 'seed/media/events', manifest: 'main' }],
  ])

  it('reports a 404 and keeps going', async () => {
    const manifests = { main: {}, children: {} }
    const downloadImpl = async (url, dir) => {
      if (url.endsWith('missing.jpg')) throw new Error('HTTP 404')
      return { path: path.join(dir, 'ok.jpg') }
    }
    const result = await harvestPlan(plan, manifests, { downloadImpl, root: mkdtempSync(path.join(tmpdir(), 'harvest-')) })
    expect(result).toMatchObject({ downloaded: 1, failures: [{ url: `${CDN}/missing.jpg`, reason: 'HTTP 404' }] })
    expect(manifests.main[`${CDN}/ok.jpg`]).toEqual({ path: 'seed/media/events/ok.jpg', alt: 'OK' })
  })

  it('skips URLs already in the manifest whose file exists', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'harvest-'))
    const manifests = { main: { [`${CDN}/ok.jpg`]: { path: 'seed/media/events/ok.jpg' } }, children: {} }
    mkdirSync(path.join(root, 'seed/media/events'), { recursive: true })
    writeFileSync(path.join(root, 'seed/media/events/ok.jpg'), 'x')
    let calls = 0
    const downloadImpl = async () => {
      calls++
      throw new Error('HTTP 404')
    }
    const result = await harvestPlan(plan, manifests, { downloadImpl, root })
    expect(result.skipped).toBe(1)
    expect(calls).toBe(1) // only missing.jpg is attempted
  })
})

describe('download from the S3 mirror', () => {
  const cdn = 'https://cdn.prod.website-files.com/site/abc_Hero_v2.webp'
  const ok = (body) => ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'image/webp' }), arrayBuffer: async () => new TextEncoder().encode(body).buffer })

  it('maps a Webflow CDN URL to its S3 copy, and nothing else', () => {
    expect(s3Mirror(cdn)).toBe('https://s3.amazonaws.com/webflow-prod-assets/site/abc_Hero_v2.webp')
    expect(s3Mirror('https://example.org/a.jpg')).toBeUndefined()
  })

  it('falls back to S3 when the CDN is unreachable, keeping the CDN file name', async () => {
    const asked = []
    const fetchImpl = async (url) => {
      asked.push(url)
      if (url.startsWith('https://cdn.')) throw new Error('CONNECT tunnel failed, response 403')
      return ok('bytes')
    }
    const root = mkdtempSync(path.join(tmpdir(), 'harvest-'))
    const entry = await download(cdn, 'seed/media/events', { fetchImpl, root })
    expect(asked).toEqual([cdn, s3Mirror(cdn)])
    expect(entry).toMatchObject({ path: path.join('seed/media/events', localFileName(cdn)), contentType: 'image/webp', bytes: 5 })
  })

  it('does not try the mirror when the CDN answers', async () => {
    const asked = []
    const entry = await download(cdn, 'x', { fetchImpl: async (url) => (asked.push(url), ok('a')), root: mkdtempSync(path.join(tmpdir(), 'harvest-')) })
    expect(asked).toEqual([cdn])
    expect(entry.bytes).toBe(1)
  })
})

describe('pruneUnreferenced', () => {
  it('removes the old copy of an asset that moved folder', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'harvest-'))
    mkdirSync(path.join(root, 'public/images/pages'), { recursive: true })
    writeFileSync(path.join(root, 'public/images/pages/hero.webp'), 'x')
    const manifests = { main: { [`${CDN}/hero.webp`]: { path: 'public/images/pages/hero.webp' } }, children: {} }
    const plan = new Map([[`${CDN}/hero.webp`, { dir: 'seed/media/events', manifest: 'main' }]])
    const before = manifestPaths(manifests)
    const downloadImpl = async (url, dir) => {
      mkdirSync(path.join(root, dir), { recursive: true })
      writeFileSync(path.join(root, dir, 'hero.webp'), 'x')
      return { path: `${dir}/hero.webp` }
    }
    await harvestPlan(plan, manifests, { downloadImpl, root })
    expect(pruneUnreferenced(plan, manifests, root, before)).toBe(1)
    expect(existsSync(path.join(root, 'public/images/pages/hero.webp'))).toBe(false)
    expect(existsSync(path.join(root, 'seed/media/events/hero.webp'))).toBe(true)
  })

  it('removes downloads the snapshot no longer uses, never hand-added project images', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'harvest-'))
    const dir = path.join(root, 'public/images/pages')
    mkdirSync(dir, { recursive: true })
    for (const f of ['kept.webp', 'stale.webp', 'programs-hero.webp']) writeFileSync(path.join(dir, f), 'x')
    const manifests = {
      main: {
        [`${CDN}/kept.webp`]: { path: 'public/images/pages/kept.webp' },
        [`${CDN}/stale.webp`]: { path: 'public/images/pages/stale.webp' },
      },
      children: {},
    }
    const plan = new Map([[`${CDN}/kept.webp`, { dir: 'public/images/pages' }]])
    expect(pruneUnreferenced(plan, manifests, root)).toBe(1)
    expect(readdirSync(dir).sort()).toEqual(['kept.webp', 'programs-hero.webp'])
    expect(Object.keys(manifests.main)).toEqual([`${CDN}/kept.webp`])
  })
})
