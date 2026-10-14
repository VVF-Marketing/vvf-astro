// An English item can't be published until its Spanish version has every
// required field (spec 4.5, check 2; Q6 on the spec card). Checked on every
// publish through the CMS: the admin, the REST API and an AI assistant over
// MCP (src/lib/emdashGuard.ts). Applies to the content model's types
// (src/lib/contentModel.mjs); page copy falls back to English by design.
import { MODEL_COLLECTIONS } from './contentModel.mjs'

interface FieldDef {
  slug: string
  label: string
  required?: boolean
  translatable?: boolean
}

// Required fields a Spanish version must fill in: required and per language.
export function requiredSpanishFields(collection: unknown): FieldDef[] {
  const type = (MODEL_COLLECTIONS as { slug: string; fields: FieldDef[] }[]).find((c) => c.slug === collection)
  return (type?.fields ?? []).filter((f) => f.required && f.translatable !== false)
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

// The item a CMS call publishes: a publish or schedule, or a create/update
// that sets the status to published.
export interface PublishTarget {
  collection: string
  id?: string
  locale?: string
}

export function publishTarget(op: { tool: string; args: Record<string, any> }): PublishTarget | undefined {
  const { tool, args } = op
  const collection = typeof args.collection === 'string' ? args.collection : undefined
  if (!collection || requiredSpanishFields(collection).length === 0) return undefined
  const id = args.id !== undefined ? String(args.id) : undefined
  if (tool === 'content_publish' || tool === 'content_schedule') return { collection, id, locale: args.locale }
  if ((tool === 'content_create' || tool === 'content_update') && args.status === 'published') return { collection, id, locale: args.locale }
  return undefined
}

export interface SpanishLookup {
  // An item's locale and data; undefined when it doesn't exist.
  get(collection: string, id: string, locale?: string): Promise<{ locale?: string | null; data: Record<string, unknown> } | undefined>
  // The ids and locales of an item's translations.
  translations(collection: string, id: string): Promise<{ id: string; locale: string | null }[]>
}

// Why the publish is refused, or undefined when it may go ahead.
export async function spanishIncompleteError(target: PublishTarget, lookup: SpanishLookup): Promise<string | undefined> {
  const required = requiredSpanishFields(target.collection)
  if (required.length === 0) return undefined
  if (target.locale === 'es') return undefined
  const list = (fields: FieldDef[]) => fields.map((f) => f.label).join(', ')
  if (!target.id) return `Save this item and add its Spanish version before publishing. The Spanish version needs: ${list(required)}.`
  const item = await lookup.get(target.collection, target.id)
  if (!item || item.locale === 'es') return undefined
  const es = (await lookup.translations(target.collection, target.id)).find((t) => t.locale === 'es')
  if (!es) return `Add the Spanish version before publishing. It needs: ${list(required)}.`
  const spanish = await lookup.get(target.collection, es.id, 'es')
  const missing = required.filter((f) => isEmptyValue(spanish?.data[f.slug]))
  return missing.length ? `Fill in the Spanish version before publishing. Still empty: ${list(missing)}.` : undefined
}
