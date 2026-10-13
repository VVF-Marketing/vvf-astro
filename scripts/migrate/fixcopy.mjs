// One-off: correct Spanish content that the migration got wrong in an existing
// CMS (review findings on PR #15, Steps 5 and 21). The seed files are fixed,
// but `import-copy` only fills empty slots and the seed doesn't overwrite
// loaded content, so a CMS that already imported the old values keeps them.
//
// Copy slots: the swapped values below, and appeal image descriptions the
// live site never translated. CMS entries (Step 21): the Trustee tier name,
// the Spanish tiers' benefits and the Spanish event image descriptions, read
// from seed/seed.json (see contentCorrections).
//
// Only a slot whose current Spanish value is exactly the known-wrong one (or
// still empty) is changed; anything an editor has changed since is left alone and reported.
// Rows with an open draft are skipped. Without --apply it only reports what it
// would do. Needs EMDASH_URL (default http://localhost:4321) and
// EMDASH_SYNC_PAT (content:read + content:write).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { EmDashClient } from 'emdash/client'
import { copyCollectionFor } from '../../src/lib/cmsNavigation.mjs'
import { ROOT_DIR } from './lib/paths.mjs'

// [route, key, swapped value, correct value]
export const CORRECTIONS = [
  ['/', 'hero.label.1', 'Formas de ayudar', 'Apadrina a un niño'],
  ['/', 'hero.label.2', 'Apadrina a un niño', 'Formas de ayudar'],
  ['/sponsor-a-child', 'button4.text', 'Formas de ayudar', 'Apadrina a un niño'],
  ['/sponsor-a-child', 'programsCta.label.1', 'Formas de ayudar', 'Apadrina a un niño'],
  ['/blog', 'filter.Stories', 'Finanzas y transparencia', 'Historias'],
  ['_global', 'footer.link.sponsorChild', 'Formas de ayudar', 'Apadrina a un niño'],
  ['_global', 'footer.link.waysToGive', 'Apadrina a un niño', 'Formas de ayudar'],
  ['_global', 'child.breadcrumb', 'Formas de ayudar', 'Apadrina a un niño'],
  ['_global', 'resources.heading', 'Nosotros', 'Recursos'],
  ['_global', 'resources.category.stories', 'Finanzas y transparencia', 'Historias'],
  // Step 21: never translated on the live site (empty in Spanish until now).
  ...['/ways-to-give', '/earthquake-relief'].flatMap((route) => [
    [route, 'appealPanel.imageAlt.1', '', 'Familias llegando al patio del futuro centro de apoyo de VVF.'],
    [route, 'appealPanel.imageAlt.2', '', 'Una enfermera examina a una niña mientras su madre está sentada a su lado.'],
    [route, 'appealPanel.cards.nutritionAlt', '', 'Niños comiendo juntos una comida caliente en el comedor del centro.'],
  ]),
]

const MEDIA_FIELDS = ['image', 'hero_image', 'hero_image_mobile']
const BENEFIT_FIELDS = ['recognition_benefits', 'activity_benefits', 'promotional_benefits']

// Step 21 corrections for CMS entries, from the seed's Spanish entries and
// their English counterparts: { collection, id, field, wrong, right }, where
// `wrong` is the value the old migration loaded (the English one, or
// "Patrocinador") and `right` the seed's. A field's whole value is compared
// and written (an image, the gallery, the appeal cards, a benefit list).
export function contentCorrections(seed) {
  const out = []
  const content = seed.content ?? {}
  const english = (collection, id) => (content[collection] ?? []).find((e) => e.id === id)
  const add = (collection, entry, field, wrong, right) => {
    if (JSON.stringify(wrong) !== JSON.stringify(right)) out.push({ collection, id: entry.id, slug: entry.slug, field, wrong, right })
  }
  for (const entry of content.sponsorship_packages ?? []) {
    const en = entry.locale === 'es' && entry.id.startsWith('sp-general-') && english('sponsorship_packages', entry.translationOf)
    if (!en) continue
    if (entry.data.tier_name === 'Benefactor') add('sponsorship_packages', entry, 'tier_name', 'Patrocinador', 'Benefactor')
    for (const field of BENEFIT_FIELDS) if (entry.data[field]) add('sponsorship_packages', entry, field, en.data[field], entry.data[field])
  }
  for (const entry of content.events ?? []) {
    const en = entry.locale === 'es' && english('events', entry.translationOf)
    if (!en) continue
    // The old value: the same images, each with the English description.
    const englishAlt = new Map(
      [...MEDIA_FIELDS.map((f) => en.data[f]), ...(en.data.gallery ?? [])].filter((v) => v?.id).map((v) => [v.id, v.alt])
    )
    const withEnglishAlt = (v) => (v?.id && englishAlt.has(v.id) ? { ...v, alt: englishAlt.get(v.id) } : v)
    for (const field of MEDIA_FIELDS) if (entry.data[field]) add('events', entry, field, withEnglishAlt(entry.data[field]), entry.data[field])
    if (entry.data.gallery) add('events', entry, 'gallery', entry.data.gallery.map(withEnglishAlt), entry.data.gallery)
    if (entry.data.appeal_cards && en.data.appeal_cards) {
      const old = entry.data.appeal_cards.map((card, i) => ({ ...card, image_alt: en.data.appeal_cards[i]?.image_alt ?? card.image_alt }))
      add('events', entry, 'appeal_cards', old, entry.data.appeal_cards)
    }
  }
  return out
}

const readSeed = () => JSON.parse(readFileSync(path.join(ROOT_DIR, 'seed/seed.json'), 'utf8'))

export async function fixCopy({
  apply = process.argv.includes('--apply'),
  baseUrl = process.env.EMDASH_URL ?? 'http://localhost:4321',
  token = process.env.EMDASH_SYNC_PAT,
  client = token ? new EmDashClient({ baseUrl, token }) : undefined,
  corrections = CORRECTIONS,
  entryCorrections = contentCorrections(readSeed()),
  log = console.log,
} = {}) {
  if (!client) throw new Error('fixCopy needs EMDASH_SYNC_PAT (a token with content:read + content:write)')
  const result = { fixed: [], alreadyRight: [], edited: [], draft: [], missing: [] }
  const rowsByCollection = new Map()
  const rowsFor = async (collection) => {
    if (!rowsByCollection.has(collection)) {
      const rows = new Map()
      try {
        for await (const item of client.listAll(collection, { locale: 'es' })) rows.set(item.data.key, item)
      } catch (error) {
        if (error?.status !== 404) throw error
      }
      rowsByCollection.set(collection, rows)
    }
    return rowsByCollection.get(collection)
  }
  for (const [route, key, wrong, right] of corrections) {
    const collection = copyCollectionFor(route)
    const label = `${route} ${key}`
    const row = (await rowsFor(collection)).get(key)
    const current = row?.data?.value
    if (!row) result.missing.push(label)
    else if (current === right) result.alreadyRight.push(label)
    else if (current && current !== wrong) result.edited.push(`${label}: "${current}"`)
    else if (row.draftRevisionId) result.draft.push(label)
    else {
      if (apply) {
        await client.update(collection, row.id, { data: { value: right }, _rev: row._rev })
        await client.publish(collection, row.id)
      }
      result.fixed.push(`${label}: ${current ? `"${current}"` : '(empty)'} → "${right}"`)
    }
  }
  // CMS entries: one update per entry, with every field that still holds
  // the old value.
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const byEntry = new Map()
  for (const c of entryCorrections) {
    const k = `${c.collection}/${c.id}`
    byEntry.set(k, [...(byEntry.get(k) ?? []), c])
  }
  // Seeded entries with a slug get a new id in the CMS: find them by slug.
  const spanishEntries = new Map()
  const findEntry = async (collection, id, slug) => {
    if (!spanishEntries.has(collection)) {
      const items = []
      try {
        for await (const item of client.listAll(collection, { locale: 'es' })) items.push(item)
      } catch (error) {
        if (error?.status !== 404) throw error
      }
      spanishEntries.set(collection, items)
    }
    return spanishEntries.get(collection).find((item) => (slug ? item.slug === slug : item.id === id))
  }
  for (const [label, fixes] of byEntry) {
    const { collection, id, slug } = fixes[0]
    const item = await findEntry(collection, id, slug)
    if (!item) {
      result.missing.push(label)
      continue
    }
    const data = {}
    for (const { field, wrong, right } of fixes) {
      const current = item.data?.[field]
      if (same(current, right)) result.alreadyRight.push(`${label} ${field}`)
      else if (!same(current, wrong)) result.edited.push(`${label} ${field}`)
      else data[field] = right
    }
    const fields = Object.keys(data)
    if (!fields.length) continue
    if (item.draftRevisionId) {
      result.draft.push(`${label} (${fields.join(', ')})`)
      continue
    }
    if (apply) {
      await client.update(collection, item.id, { data, _rev: item._rev })
      await client.publish(collection, item.id)
    }
    result.fixed.push(`${label}: ${fields.join(', ')}`)
  }

  log(`${apply ? 'Fixed' : 'Would fix (re-run with --apply)'}: ${result.fixed.length}`)
  for (const line of result.fixed) log(`  ${line}`)
  log(`Already right: ${result.alreadyRight.length}`)
  if (result.edited.length) log(`Changed by someone since, left alone:\n  ${result.edited.join('\n  ')}`)
  if (result.draft.length) log(`Open draft, skipped: ${result.draft.join(', ')}`)
  if (result.missing.length) log(`No Spanish row: ${result.missing.join(', ')}`)
  return result
}
