import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectAssets, harvestPlan, localFileName, planAssets } from './harvest.mjs'

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
