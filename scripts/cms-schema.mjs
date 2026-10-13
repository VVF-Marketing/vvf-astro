#!/usr/bin/env node
// `npm run cms:schema [-- --dry-run]`: apply the admin organization
// (src/lib/cmsNavigation.mjs) to a running EmDash, schema only.
//
// - creates missing copy collections (one per copy page) and their missing
//   fields (src/lib/copyCollections.mjs);
// - updates every configured collection's label, description, folder,
//   order and visibility, copy collection fields' label and searchability,
//   and renamed field labels.
//
// It never touches menus, settings or content, compares before writing (a
// second run changes nothing), and never deletes. Re-running `emdash seed
// --on-conflict update` instead would rebuild the menus and overwrite site
// settings, losing editors' work.
//
// Needs an admin token with schema:read + schema:write (EMDASH_ADMIN_TOKEN)
// and the server's address (EMDASH_URL, default http://localhost:4321). The
// token is for this script and the copy migration only; the always-on sync
// token (EMDASH_SYNC_PAT) stays content-only.
import { pathToFileURL } from 'node:url'
import { EmDashClient } from 'emdash/client'
import { CONTENT_COLLECTIONS, COPY_PAGES, sidebarSettings } from '../src/lib/cmsNavigation.mjs'
import { copyCollectionDefinition } from '../src/lib/copyCollections.mjs'

const SETTING_KEYS = ['label', 'labelSingular', 'description', 'group', 'sortOrder', 'hidden', 'titleField']

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// `api(method, path, body)` calls EmDash's REST API under /_emdash/api.
export async function applyCmsSchema({ api, dryRun = false, log = () => {} }) {
  const result = { collectionsCreated: [], collectionsUpdated: [], fieldsCreated: [], fieldsUpdated: [], missing: [] }
  const write = async (method, path, body) => {
    if (!dryRun) await api(method, path, body)
  }
  const existing = new Map((await api('GET', '/schema/collections')).items.map((c) => [c.slug, c]))
  const settings = sidebarSettings()
  const copyDefs = new Map(COPY_PAGES.map((p) => [copyCollectionDefinition(p).slug, copyCollectionDefinition(p)]))

  // Desired settings per collection: sidebar settings, plus title field and
  // list columns for copy collections.
  const desired = Object.fromEntries(
    Object.entries(settings).map(([slug, s]) => {
      const def = copyDefs.get(slug)
      return [slug, def ? { ...s, titleField: def.titleField, admin: def.admin } : s]
    })
  )

  for (const [slug, def] of copyDefs) {
    if (existing.has(slug)) continue
    const s = desired[slug]
    log(`+ collection ${slug} (${s.label})`)
    await write('POST', '/schema/collections', {
      slug,
      label: s.label,
      labelSingular: s.labelSingular,
      description: s.description,
      supports: def.supports,
      routable: def.routable,
      admin: def.admin,
      hidden: s.hidden,
      sortOrder: s.sortOrder,
      group: s.group,
    })
    result.collectionsCreated.push(slug)
    existing.set(slug, { slug, label: s.label, labelSingular: s.labelSingular, description: s.description, admin: def.admin, hidden: s.hidden, sortOrder: s.sortOrder, group: s.group, fields: [] })
  }

  // Copy collection fields: create the missing ones and bring existing ones'
  // label and searchability in line (never change a type or delete).
  for (const [slug, def] of copyDefs) {
    const current = result.collectionsCreated.includes(slug)
      ? []
      : ((await api('GET', `/schema/collections/${slug}?includeFields=true`)).item.fields ?? [])
    const have = new Map(current.map((f) => [f.slug, f]))
    for (const [i, field] of def.fields.entries()) {
      const existingField = have.get(field.slug)
      if (existingField) {
        const changes = {}
        if (existingField.label !== field.label) changes.label = field.label
        if (Boolean(existingField.searchable) !== Boolean(field.searchable)) changes.searchable = Boolean(field.searchable)
        if (!Object.keys(changes).length) continue
        log(`~ field ${slug}.${field.slug}: ${Object.keys(changes).join(', ')}`)
        await write('PUT', `/schema/collections/${slug}/fields/${field.slug}`, { ...changes, validation: existingField.validation ?? null })
        result.fieldsUpdated.push(`${slug}.${field.slug}`)
        continue
      }
      log(`+ field ${slug}.${field.slug}`)
      const { slug: fieldSlug, label, type, required, indexed, translatable, searchable, defaultValue } = field
      await write('POST', `/schema/collections/${slug}/fields`, {
        slug: fieldSlug,
        label,
        type,
        required,
        indexed,
        translatable,
        searchable,
        defaultValue,
        validation: field.validation ?? null,
        sortOrder: i,
      })
      result.fieldsCreated.push(`${slug}.${fieldSlug}`)
    }
  }

  // Collection settings.
  for (const [slug, want] of Object.entries(desired)) {
    const have = existing.get(slug)
    if (!have) {
      result.missing.push(slug)
      continue
    }
    const changes = {}
    for (const key of SETTING_KEYS) if (key in want && !same(have[key], want[key])) changes[key] = want[key]
    if (want.admin && !same(have.admin?.listColumns, want.admin.listColumns)) changes.admin = want.admin
    if (!Object.keys(changes).length) continue
    log(`~ collection ${slug}: ${Object.keys(changes).join(', ')}`)
    await write('PUT', `/schema/collections/${slug}`, changes)
    result.collectionsUpdated.push(slug)
  }

  // Renamed field labels (e.g. the site banner's switch).
  for (const c of CONTENT_COLLECTIONS.filter((c) => c.fieldLabels && existing.has(c.slug))) {
    const fields = (await api('GET', `/schema/collections/${c.slug}?includeFields=true`)).item.fields ?? []
    for (const field of fields) {
      const label = c.fieldLabels[field.slug]
      if (!label || field.label === label) continue
      log(`~ field ${c.slug}.${field.slug}: label`)
      await write('PUT', `/schema/collections/${c.slug}/fields/${field.slug}`, { label, validation: field.validation ?? null })
      result.fieldsUpdated.push(`${c.slug}.${field.slug}`)
    }
  }

  return result
}

export function restApi(client) {
  // EmDashClient has no public update calls for schema; its request helper
  // handles auth, CSRF and error mapping.
  return (method, path, body) => client.request(method, path, body)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.EMDASH_ADMIN_TOKEN
  if (!token) {
    console.error('cms:schema needs EMDASH_ADMIN_TOKEN (an admin token with schema:read + schema:write).')
    process.exit(1)
  }
  const dryRun = process.argv.includes('--dry-run')
  const client = new EmDashClient({ baseUrl: process.env.EMDASH_URL ?? 'http://localhost:4321', token })
  const result = await applyCmsSchema({ api: restApi(client), dryRun, log: (line) => console.log(line) })
  const total = result.collectionsCreated.length + result.collectionsUpdated.length + result.fieldsCreated.length + result.fieldsUpdated.length
  console.log(
    `${dryRun ? '[dry run] would apply' : 'Applied'} ${total} change(s): ${result.collectionsCreated.length} collections created, ` +
      `${result.collectionsUpdated.length} updated, ${result.fieldsCreated.length} fields created, ${result.fieldsUpdated.length} fields updated.`
  )
  if (result.missing.length) console.warn(`Collections configured but not in this CMS (seed them first): ${result.missing.join(', ')}`)
}
