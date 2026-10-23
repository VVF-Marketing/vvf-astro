import { describe, expect, it } from 'vitest'
import { PREVIEW_BANNER_TEXT, showPreviewBanner } from './previewBanner'

describe('showPreviewBanner', () => {
  it('shows only on Vercel preview deployments', () => {
    expect(showPreviewBanner('preview')).toBe(true)
    for (const env of ['production', 'development', '', undefined]) expect(showPreviewBanner(env), String(env)).toBe(false)
  })

  it('asks testers not to upload real photos', () => {
    expect(PREVIEW_BANNER_TEXT).toMatch(/real photos/)
  })
})
