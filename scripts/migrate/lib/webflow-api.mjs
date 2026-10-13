// Minimal Webflow Data API v2 client (read-only). Used by extract.mjs when
// WEBFLOW_API_TOKEN + WEBFLOW_SITE_ID are set; otherwise the sitemap scrape
// runs instead.
import { fetchWithRetry, HttpError } from './http.mjs'

const API = 'https://api.webflow.com/v2'

export function apiCredentials(env = process.env) {
  const token = env.WEBFLOW_API_TOKEN?.trim()
  const siteId = env.WEBFLOW_SITE_ID?.trim()
  return token && siteId ? { token, siteId } : undefined
}

async function get(path, token) {
  const res = await fetchWithRetry(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!res.ok) throw new HttpError(`${API}${path}`, res.status)
  return res.json()
}

export async function listCollections({ token, siteId }) {
  const { collections } = await get(`/sites/${siteId}/collections`, token)
  return collections
}

export async function getCollection({ token }, collectionId) {
  return get(`/collections/${collectionId}`, token)
}

// Published (live) items only, primary locale; drafts and archived items are
// never returned by the /items/live endpoint.
export async function listLiveItems({ token }, collectionId) {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const page = await get(`/collections/${collectionId}/items/live?limit=100&offset=${offset}`, token)
    items.push(...page.items)
    if (items.length >= page.pagination.total || page.items.length === 0) break
  }
  return items.filter((i) => !i.isDraft && !i.isArchived)
}

// Throws HttpError(401/403) when the token can't read the site, which
// extract.mjs treats as "fall back to scraping".
export async function checkAccess(creds) {
  await listCollections(creds)
  return true
}
