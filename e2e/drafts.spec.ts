import { existsSync, readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext } from '@playwright/test'

// Needs an EmDash API token (content:read + content:write) for the database
// the server under test uses — EMDASH_SYNC_PAT from the environment or .env.
// CI seeds a fresh database with no tokens, so this only runs locally.
function token(): string | undefined {
  if (process.env.EMDASH_SYNC_PAT) return process.env.EMDASH_SYNC_PAT
  const env = new URL('../.env', import.meta.url)
  if (!existsSync(env)) return undefined
  return readFileSync(env, 'utf8').match(/^EMDASH_SYNC_PAT=(.+)$/m)?.[1].trim()
}

const TOKEN = token()
test.skip(!TOKEN, 'no EmDash API token available')

const api = (request: APIRequestContext) => {
  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
  const base = '/_emdash/api'
  return {
    async findSlot(route: string, key: string) {
      const filters = encodeURIComponent(JSON.stringify({ route_path: route, key }))
      const res = await request.get(`${base}/content/page_copy?locale=en&limit=1&fieldFilters=${filters}`, { headers })
      return (await res.json()).data.items[0] as { id: string; data: { value: string } }
    },
    async rev(id: string) {
      return (await (await request.get(`${base}/content/page_copy/${id}`, { headers })).json()).data._rev as string
    },
    async update(id: string, value: string) {
      const res = await request.put(`${base}/content/page_copy/${id}`, { headers, data: { data: { value }, _rev: await this.rev(id) } })
      expect(res.ok(), await res.text()).toBe(true)
    },
    async publish(id: string) {
      expect((await request.post(`${base}/content/page_copy/${id}/publish`, { headers })).ok()).toBe(true)
    },
    async revisions(id: string) {
      const res = await request.get(`${base}/content/page_copy/${id}/revisions`, { headers })
      return (await res.json()).data.items as { id: string; data: { value?: string } }[]
    },
    async restore(revisionId: string) {
      expect((await request.post(`${base}/revisions/${revisionId}/restore`, { headers })).ok()).toBe(true)
    },
  }
}

const privacyNote = (html: string) => html.match(/We respect your privacy[^<]*|DRAFT-[^<]*|PUBLISHED-[^<]*/)?.[0]

test('a draft edit stays off the public site until published, and a revision restores it', async ({ request }) => {
  const cms = api(request)
  const slot = await cms.findSlot('_global', 'newsletter.privacy')
  const original = 'We respect your privacy. Unsubscribe at any time.'
  const page = async () => privacyNote(await (await request.get('/resources')).text())

  await cms.update(slot.id, `DRAFT-${Date.now()}`)
  expect(await page()).toBe(original)

  const published = `PUBLISHED-${Date.now()}`
  await cms.update(slot.id, published)
  await cms.publish(slot.id)
  expect(await page()).toBe(published)

  const earlier = (await cms.revisions(slot.id)).find((r) => r.data.value === original)
  expect(earlier, 'a revision with the original text').toBeDefined()
  await cms.restore(earlier!.id)
  await cms.publish(slot.id)
  expect(await page()).toBe(original)
})
