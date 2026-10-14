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

// Spec 4.5, check 2: an English item is published only once its Spanish
// version has every required field, whoever publishes and however.
describe('Spanish-complete publishing', () => {
  const faqs: Record<string, { locale: string; data: Record<string, unknown> }> = {
    en1: { locale: 'en', data: { question: 'Q?', answer: 'A.' } },
    es1: { locale: 'es', data: { question: '¿P?', answer: '' } },
    en2: { locale: 'en', data: { question: 'Q2?', answer: 'A2.' } },
    es2: { locale: 'es', data: { question: '¿P2?', answer: 'R2.' } },
  }
  const cms = {
    handleContentGet: async (_c: string, id: string) => (faqs[id] ? { success: true, data: { item: faqs[id] } } : { success: false }),
    handleContentTranslations: async (_c: string, id: string) => ({
      success: true,
      data: { translationGroup: 'g', translations: [`en${id.slice(-1)}`, `es${id.slice(-1)}`].map((t) => ({ id: t, locale: faqs[t].locale })) },
    }),
  }
  const admin = { id: 'a1', email: 'admin@example.org', role: 50 }
  const send = (path: string, init: RequestInit = {}) => {
    const url = new URL(`http://localhost${path}`)
    const context = { url, request: new Request(url, init), locals: { user: admin, emdash: cms } } as unknown as APIContext
    return guardEmDashApi(context, async () => new Response('next'))
  }

  it('refuses publishing an English FAQ whose Spanish answer is empty', async () => {
    const res = await send('/_emdash/api/content/faqs/en1/publish', { method: 'POST' })
    expect(res?.status).toBe(400)
    expect(await res?.text()).toMatch(/Spanish version.*Answer/i)
  })

  it('refuses it over MCP too, as a tool error', async () => {
    const body = { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'content_publish', arguments: { collection: 'faqs', id: 'en1' } } }
    const res = await send('/_emdash/api/mcp', { method: 'POST', body: JSON.stringify(body) })
    expect(await res?.json()).toMatchObject({ id: 7, result: { isError: true } })
  })

  it('publishes once the Spanish version is complete', async () => {
    // No response from the guard: the request goes on to EmDash.
    expect(await send('/_emdash/api/content/faqs/en2/publish', { method: 'POST' })).toBeUndefined()
  })
})
