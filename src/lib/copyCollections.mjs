// Copy collections: one EmDash collection per copy manifest (src/lib/copy.ts),
// shown under "Pages & SEO" (src/lib/cmsNavigation.mjs). Shared by the seed
// (scripts/migrate/transform.mjs), the schema apply script, the static-page
// sync and the content adapter. Plain ESM so Node scripts can import it.
import { COPY_PAGES, copyCollectionFor, sidebarSettings } from './cmsNavigation.mjs'

// Fields of every copy collection, one row per slot per locale. Only the
// value fields are translated; EmDash copies the rest across locales.
export const COPY_FIELDS = [
  { slug: 'title', label: 'Title (number on the page · section · where it appears)', type: 'string', required: true, indexed: true, translatable: false },
  { slug: 'key', label: 'Slot key', type: 'string', required: true, indexed: true, translatable: false },
  { slug: 'label', label: 'Where this text appears', type: 'string', required: true, translatable: false },
  { slug: 'section', label: 'Section', type: 'select', required: true, translatable: false, validation: { options: ['seo', 'content'] } },
  { slug: 'position', label: 'Number on the page', type: 'integer', required: true, translatable: false },
  { slug: 'format', label: 'Format', type: 'select', required: true, translatable: false, validation: { options: ['plain', 'rich', 'image'] } },
  { slug: 'max_length', label: 'Maximum length (characters)', type: 'integer', translatable: false },
  // Searchable: the admin list's search box finds a slot by the words on the
  // site (EmDash can't show a multi-line text field as a list column).
  { slug: 'value', label: 'Text', type: 'text', searchable: true },
  { slug: 'rich_value', label: 'Rich text', type: 'portableText' },
  { slug: 'image_value', label: 'Image', type: 'image' },
  { slug: 'stale', label: 'Stale (slot no longer used by the page)', type: 'boolean', defaultValue: false, indexed: true, translatable: false },
]

// Fields only the site's code sets; editors change a slot's value only.
export const COPY_STRUCTURAL_FIELDS = COPY_FIELDS.filter((f) => f.translatable === false).map((f) => f.slug)

// EmDash collection definition (seed format) for a copy page.
export function copyCollectionDefinition(page) {
  return {
    slug: copyCollectionFor(page.route),
    label: page.name,
    labelSingular: 'Text slot',
    routable: false,
    titleField: 'title',
    supports: ['drafts', 'revisions'],
    admin: { listColumns: [] },
    fields: COPY_FIELDS,
  }
}

// Section, number and shown title of each slot of a manifest: SEO slots
// (keys `seo.*`) first, then content, each in declaration order; numbers are
// zero-padded so sorting by title gives page order ("01 · SEO · Title").
export function slotLayout(manifest) {
  const keys = Object.keys(manifest.slots)
  const ordered = [...keys.filter((k) => k.startsWith('seo.')), ...keys.filter((k) => !k.startsWith('seo.'))]
  const width = Math.max(2, String(ordered.length).length)
  return new Map(
    ordered.map((key, i) => {
      const section = key.startsWith('seo.') ? 'seo' : 'content'
      const position = i + 1
      const title = `${String(position).padStart(width, '0')} · ${section === 'seo' ? 'SEO' : 'Content'} · ${manifest.slots[key].label}`
      return [key, { section, position, title }]
    })
  )
}

// The seed's collection list with the admin organization applied: the old
// single `page_copy` collection replaced by one copy collection per page,
// and every collection's label, description, folder, order and visibility
// (plus renamed field labels) taken from cmsNavigation.mjs.
export function organizeCollections(collections, contentCollections) {
  const settings = sidebarSettings()
  const fieldLabels = Object.fromEntries(contentCollections.filter((c) => c.fieldLabels).map((c) => [c.slug, c.fieldLabels]))
  const kept = collections.filter((c) => c.slug !== 'page_copy' && !c.slug.startsWith('copy_'))
  const all = [...COPY_PAGES.map(copyCollectionDefinition), ...kept]
  return all.map((c) => {
    const s = settings[c.slug] ?? {}
    const labels = fieldLabels[c.slug]
    const out = { ...c, ...s }
    if (s.group === null) delete out.group
    if (labels) out.fields = c.fields.map((f) => (labels[f.slug] ? { ...f, label: labels[f.slug] } : f))
    return out
  })
}
