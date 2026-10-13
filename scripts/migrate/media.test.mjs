import { describe, expect, it } from 'vitest'
import { copyStaticMedia } from './media.mjs'

const CDN = 'https://cdn.prod.website-files.com/site'

describe('copyStaticMedia', () => {
  it('copies each seed SVG once and counts the files to seed', () => {
    const copied = []
    const result = copyStaticMedia({
      manifest: {
        [`${CDN}/logo.svg`]: { path: 'seed/media/sponsors/logo.svg', contentType: 'image/svg+xml' },
        [`${CDN}/logo-2.svg`]: { path: 'seed/media/sponsors/logo.svg', contentType: 'image/svg+xml' },
        [`${CDN}/a.png`]: { path: 'seed/media/team_members/a.png', contentType: 'image/png' },
        [`${CDN}/hero.svg`]: { path: 'public/images/pages/hero.svg', contentType: 'image/svg+xml' },
      },
      copy: (rel) => copied.push(rel),
    })
    expect(copied).toEqual(['seed/media/sponsors/logo.svg'])
    expect(result).toEqual({ staticFiles: 1, seeded: 1 })
  })
})
