// Step: seed/page-copy.es.json → the Spanish rows of each page's copy
// collection (src/lib/cmsNavigation.mjs) in a running
// EmDash (EMDASH_URL, default http://localhost:4321; token EMDASH_SYNC_PAT).
//
// The rows themselves are created by the static-page sync (first request after
// the server starts); this step only fills Spanish values that are still empty
// and publishes them, so it never overwrites an editor's text and is safe to
// re-run. Rows with an unpublished editor draft are skipped.
import { existsSync, readFileSync } from 'node:fs'
import { EmDashClient } from 'emdash/client'
import { PAGE_COPY_ES_PATH } from './pagecopy.mjs'
import { copyCollectionFor } from '../../src/lib/cmsNavigation.mjs'
import { createSection } from './lib/report.mjs'

const isEmpty = (data) =>
  !(typeof data.value === 'string' && data.value.trim()) && !(Array.isArray(data.rich_value) && data.rich_value.length)

export async function importCopy({
  baseUrl = process.env.EMDASH_URL ?? 'http://localhost:4321',
  token = process.env.EMDASH_SYNC_PAT,
  client = token ? new EmDashClient({ baseUrl, token }) : undefined,
  translations = existsSync(PAGE_COPY_ES_PATH) ? JSON.parse(readFileSync(PAGE_COPY_ES_PATH, 'utf8')) : {},
} = {}) {
  if (!client) throw new Error('importCopy needs EMDASH_SYNC_PAT (a token with content:read + content:write)')
  const result = { imported: 0, alreadySet: 0, skippedForDraft: 0, missingRow: [] }
  for (const [route, slots] of Object.entries(translations)) {
    const collection = copyCollectionFor(route)
    const rows = new Map()
    try {
      for await (const item of client.listAll(collection, { locale: 'es' })) rows.set(item.data.key, item)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
    for (const [key, value] of Object.entries(slots)) {
      const row = rows.get(key)
      if (!row) {
        result.missingRow.push(`${route}#${key}`)
        continue
      }
      if (!isEmpty(row.data)) {
        result.alreadySet++
        continue
      }
      if (row.draftRevisionId) {
        result.skippedForDraft++
        continue
      }
      const data = Array.isArray(value) ? { rich_value: value } : { value }
      await client.update(collection, row.id, { data, _rev: row._rev })
      await client.publish(collection, row.id)
      result.imported++
    }
  }

  const report = createSection('Spanish page copy import')
  report.line(`Imported ${result.imported} Spanish slot values; ${result.alreadySet} already had a value (kept); ${result.skippedForDraft} skipped for an open draft.`)
  if (result.missingRow.length) {
    report.line(`- Slots with no Spanish row yet (run npm run cms:schema, start the server so the sync creates them, then re-run): ${result.missingRow.length}`)
  }
  report.write()
  return { ...result, missingRow: result.missingRow.length }
}
