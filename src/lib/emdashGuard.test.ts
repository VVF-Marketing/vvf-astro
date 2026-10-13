import { describe, expect, it, vi } from 'vitest'
import type { APIContext } from 'astro'

vi.mock('astro:env/server', () => ({ SAFEGUARDING_USERS: '' }))
const { guardEmDashApi } = await import('./emdashGuard')

const editor = { id: 'u1', email: 'editor@example.org', role: 40 }
const slot = { key: 'hero.heading', label: 'Hero heading', format: 'plain', max_length: 20 }
const emdash = {
  handleContentGet: async (collection: string, id: string) =>
    collection === 'page_copy' && id === 's1' ? { success: true, data: { item: { status: 'published', data: slot } } } : { success: false },
}

const call = (path: string, init: RequestInit = {}, user?: unknown) => {
  const url = new URL(`http://localhost${path}`)
  const context = { url, request: new Request(url, init), locals: { user, emdash } } as unknown as APIContext
  return guardEmDashApi(context, async () => new Response('next'))
}

describe('database snapshot', () => {
  it('is refused without a preview signature', async () => {
    expect((await call('/_emdash/api/snapshot'))?.status).toBe(403)
  })

  it('is refused with a forged preview signature (EmDash would fall back to the Editor session)', async () => {
    const res = await call('/_emdash/api/snapshot?drafts=true', { headers: { 'X-Preview-Signature': 'x' } })
    expect(res?.status).toBe(403)
  })

  it('is refused to signed-in users too', async () => {
    expect((await call('/_emdash/api/snapshot', {}, editor))?.status).toBe(403)
  })
})

describe('REST request bodies', () => {
  const edit = (value: string, contentType: string) =>
    call('/_emdash/api/content/page_copy/s1', { method: 'PUT', headers: { 'content-type': contentType }, body: JSON.stringify({ data: { value } }) }, editor)

  it.each(['application/json', 'text/plain', 'application/x-www-form-urlencoded'])('checks a JSON body sent as %s', async (type) => {
    expect((await edit('x'.repeat(21), type))?.status).toBe(403)
    expect(await (await edit('Short', type))?.text()).toBe('next')
  })

  it('refuses a body it cannot read on a guarded route', async () => {
    const res = await call('/_emdash/api/content/page_copy/s1', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'not json' }, editor)
    expect(res?.status).toBe(400)
  })

  it('lets bodiless actions and pass-through uploads through', async () => {
    expect(await (await call('/_emdash/api/content/faqs/f1/publish', { method: 'POST' }, editor))?.text()).toBe('next')
    const upload = new FormData()
    upload.append('file', new Blob(['png']), 'a.png')
    expect(await (await call('/_emdash/api/media', { method: 'POST', body: upload }, editor))?.text()).toBe('next')
  })
})
