#!/usr/bin/env node
// `npm run migrate:copy-collections`: one-time move of the old single
// `page_copy` collection into one copy collection per page
// (openspec/changes/organize-cms-admin-navigation, design D6). Run after
// `npm run cms:schema`, with the same admin token (EMDASH_ADMIN_TOKEN) and
// server (EMDASH_URL).
//
// For every slot still declared in code, in English and Spanish:
// - the published value is copied to the page's copy collection and
//   published; Spanish rows are linked as translations of the English row;
// - an unpublished editor draft on the old row is re-created as a draft on
//   the new row (saved, not published);
// - a new row that already exists is left alone, unless it still holds the
//   code default (e.g. the sync ran first), in which case the old value
//   replaces it. Re-running changes nothing.
// When every declared slot has its row, `page_copy` is hidden from the
// sidebar (kept, not deleted). Revision history isn't carried over.
import { pathToFileURL } from 'node:url'
import { EmDashClient } from 'emdash/client'
import { copyCollectionFor } from '../../src/lib/cmsNavigation.mjs'
import { slotLayout } from '../../src/lib/copyCollections.mjs'
import { loadManifests } from './pagecopy.mjs'
import { restApi } from '../cms-schema.mjs'

const LOCALES = ['en', 'es']
const VALUE_FIELDS = ['value', 'rich_value', 'image_value']

const values = (data = {}) => Object.fromEntries(VALUE_FIELDS.filter((f) => data[f] != null).map((f) => [f, data[f]]))
// Key order doesn't matter: EmDash may store an image value's keys in a
// different order than they were written.
const canonical = (v) =>
  Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v
const same = (a, b) => JSON.stringify(canonical(values(a))) === JSON.stringify(canonical(values(b)))

function defaultValues(spec) {
  const format = spec.format ?? 'plain'
  return format === 'rich' ? { rich_value: spec.default } : format === 'image' ? { image_value: { src: spec.default } } : { value: spec.default }
}

const untouched = (row, spec, locale) => {
  const v = values(row.data)
  return !row.draftRevisionId && (Object.keys(v).length === 0 || (locale === 'en' && same(row.data, defaultValues(spec))))
}

async function listAll(client, collection, locale) {
  const out = []
  for await (const item of client.listAll(collection, { locale })) out.push(item)
  return out
}

// `client`: EmDashClient (listAll/create/update/publish); `api(method, path)`:
// raw REST calls (revisions, schema).
export async function migrateCopyCollections({ client, api, manifests, dryRun = false, log = () => {} }) {
  const result = { copied: 0, draftsCopied: 0, replacedDefaults: 0, alreadyThere: 0, conflicts: [], missingCollections: [], hidden: false }

  const old = new Map()
  for (const locale of LOCALES) {
    for (const row of await listAll(client, 'page_copy', locale)) old.set(`${locale}|${row.data.route_path}#${row.data.key}`, row)
  }
  const draftValues = async (row) => {
    if (!row.draftRevisionId || row.draftRevisionId === row.liveRevisionId) return undefined
    const revision = (await api('GET', `/revisions/${row.draftRevisionId}`)).item
    return values(revision?.data)
  }

  let complete = true
  for (const manifest of manifests) {
    const collection = copyCollectionFor(manifest.route)
    const layout = slotLayout(manifest)
    let current
    try {
      current = Object.fromEntries(await Promise.all(LOCALES.map(async (l) => [l, await listAll(client, collection, l)])))
    } catch (error) {
      if (error?.status !== 404) throw error
      result.missingCollections.push(collection)
      complete = false
      continue
    }

    for (const [key, spec] of Object.entries(manifest.slots)) {
      const { title, section, position } = layout.get(key)
      const meta = { key, label: spec.label, title, section, position, format: spec.format ?? 'plain', max_length: spec.maxLength ?? null, stale: false }
      let englishId
      for (const locale of LOCALES) {
        const from = old.get(`${locale}|${manifest.route}#${key}`)
        const target = current[locale].find((r) => r.data.key === key)
        const label = `${manifest.route}#${key} (${locale})`

        if (target) {
          if (locale === 'en') englishId = target.id
          if (!from || same(target.data, from.data)) {
            result.alreadyThere++
            continue
          }
          if (!untouched(target, spec, locale)) {
            result.conflicts.push(label)
            continue
          }
          log(`~ ${label}: old value replaces default`)
          if (!dryRun) {
            await client.update(collection, target.id, { data: values(from.data), _rev: target._rev })
            await client.publish(collection, target.id)
          }
          result.replacedDefaults++
          continue
        }

        if (locale !== 'en' && !englishId) {
          complete = false
          continue
        }
        const published = from ? values(from.data) : locale === 'en' ? defaultValues(spec) : {}
        log(`+ ${label}`)
        if (dryRun) {
          if (locale === 'en') englishId = `dry-run:${key}`
          result.copied++
          continue
        }
        const created = await client.create(collection, {
          status: 'draft',
          locale,
          ...(locale !== 'en' ? { translationOf: englishId } : {}),
          data: { ...meta, ...published },
        })
        if (locale === 'en') englishId = created.id
        if (!from || from.status === 'published') await client.publish(collection, created.id)
        result.copied++
        const draft = from && (await draftValues(from))
        if (draft) {
          await client.update(collection, created.id, { data: draft })
          result.draftsCopied++
        }
      }
    }
  }

  if (complete && !result.missingCollections.length) {
    log('~ page_copy: hidden from the sidebar')
    if (!dryRun) await api('PUT', '/schema/collections/page_copy', { hidden: true })
    result.hidden = true
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.EMDASH_ADMIN_TOKEN
  if (!token) {
    console.error('migrate:copy-collections needs EMDASH_ADMIN_TOKEN (an admin token with content and schema scopes).')
    process.exit(1)
  }
  const dryRun = process.argv.includes('--dry-run')
  const client = new EmDashClient({ baseUrl: process.env.EMDASH_URL ?? 'http://localhost:4321', token })
  const result = await migrateCopyCollections({ client, api: restApi(client), manifests: await loadManifests(), dryRun, log: (l) => console.log(l) })
  console.log(`${dryRun ? '[dry run] ' : ''}`, { ...result, conflicts: result.conflicts.length })
  if (result.conflicts.length) console.warn('Kept the new collection’s edited text for:', result.conflicts.join(', '))
  if (result.missingCollections.length) console.warn('Run npm run cms:schema first; missing:', result.missingCollections.join(', '))
}
