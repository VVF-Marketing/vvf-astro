// Copy slots: every piece of visible text on a static page (and shared
// interface text) is declared here in code — key, label, format, maximum
// length and English default — and its live value comes from the EmDash
// `page_copy` collection, per locale. Developers own which slots exist;
// editors own their values. See openspec/specs/page-copy.
//
// A page declares its slots next to itself, in an underscore file Astro
// doesn't route (e.g. src/pages/ways-to-give/_copy.ts):
//
//   export default defineCopy('/ways-to-give', {
//     'hero.heading': { label: 'Hero heading', default: 'Ways to give', maxLength: 80 },
//   })
//
// Site-wide text uses the route GLOBAL_ROUTE.
import type { PortableTextBlock } from './content/types'

export const GLOBAL_ROUTE = '_global'

export type CopyFormat = 'plain' | 'rich' | 'image'

interface SlotBase {
  // Where the text appears, shown to editors (e.g. "Hero heading").
  label: string
  maxLength?: number
}

export interface PlainSlot extends SlotBase {
  format?: 'plain'
  default: string
}

export interface RichSlot extends SlotBase {
  format: 'rich'
  default: PortableTextBlock[]
}

// Image slots hold a path or URL (e.g. a page's social share image).
export interface ImageSlot extends SlotBase {
  format: 'image'
  default: string
}

export type SlotSpec = PlainSlot | RichSlot | ImageSlot

export interface CopyManifest<S extends Record<string, SlotSpec> = Record<string, SlotSpec>> {
  route: string
  slots: S
}

export function defineCopy<const S extends Record<string, SlotSpec>>(route: string, slots: S): CopyManifest<S> {
  return { route, slots }
}

export function slotFormat(spec: SlotSpec): CopyFormat {
  return spec.format ?? 'plain'
}

// A stored slot value as read from the CMS for one locale.
export interface StoredSlot {
  value?: string | null
  richValue?: PortableTextBlock[] | null
  // Image field value, already resolved to a URL by the content adapter.
  imageUrl?: string | null
}

type SlotValue<T extends SlotSpec> = T extends RichSlot ? PortableTextBlock[] : string

export type ResolvedCopy<S extends Record<string, SlotSpec>> = { [K in keyof S]: SlotValue<S[K]> }

// Rich slots render only what the site's rich text styles support: plain
// paragraphs, h2-h4, quotes, bullet/numbered lists, bold, italic and links
// (http(s), mailto, tel or site paths). Anything else an editor or an AI
// client stores is dropped before render, so rich copy can't inject embeds,
// custom blocks or script links.
const RICH_STYLES = new Set(['normal', 'h2', 'h3', 'h4', 'blockquote'])
const RICH_LIST_ITEMS = new Set(['bullet', 'number'])
const RICH_DECORATORS = new Set(['strong', 'em'])
export const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

type Span = { _type: string; text?: string; marks?: string[]; [key: string]: unknown }
type MarkDef = { _key: string; _type: string; href?: unknown }

export function sanitizeRich(blocks: PortableTextBlock[]): PortableTextBlock[] {
  return blocks.flatMap((block) => {
    if (block._type !== 'block') return []
    const style = typeof block.style === 'string' && RICH_STYLES.has(block.style) ? block.style : 'normal'
    const markDefs = ((block.markDefs as MarkDef[] | undefined) ?? []).filter(
      (d) => d._type === 'link' && typeof d.href === 'string' && SAFE_HREF.test(d.href.trim())
    )
    const linkKeys = new Set(markDefs.map((d) => d._key))
    const children = ((block.children as Span[] | undefined) ?? [])
      .filter((c) => c._type === 'span')
      .map((c) => ({ ...c, marks: (c.marks ?? []).filter((m) => RICH_DECORATORS.has(m) || linkKeys.has(m)) }))
    const listItem = typeof block.listItem === 'string' && RICH_LIST_ITEMS.has(block.listItem) ? block.listItem : undefined
    const clean: PortableTextBlock = { _type: 'block', _key: block._key, style, markDefs, children }
    if (listItem) Object.assign(clean, { listItem, level: typeof block.level === 'number' ? block.level : 1 })
    return [clean]
  })
}

// What a rich value uses that sanitizeRich would drop (for rejecting edits
// with a clear message instead of silently changing them).
export function richViolations(blocks: PortableTextBlock[]): string[] {
  const issues = new Set<string>()
  for (const block of blocks) {
    if (block._type !== 'block') {
      issues.add(`"${block._type}" blocks`)
      continue
    }
    if (typeof block.style === 'string' && !RICH_STYLES.has(block.style)) issues.add(`"${block.style}" style`)
    if (typeof block.listItem === 'string' && !RICH_LIST_ITEMS.has(block.listItem)) issues.add(`"${block.listItem}" lists`)
    const defs = (block.markDefs as MarkDef[] | undefined) ?? []
    for (const d of defs) {
      if (d._type !== 'link') issues.add(`"${d._type}" annotations`)
      else if (typeof d.href !== 'string' || !SAFE_HREF.test(d.href.trim())) issues.add(`link to "${String(d.href)}"`)
    }
    const keys = new Set(defs.map((d) => d._key))
    for (const c of (block.children as Span[] | undefined) ?? []) {
      if (c._type !== 'span') issues.add(`inline "${c._type}"`)
      for (const m of c.marks ?? []) if (!RICH_DECORATORS.has(m) && !keys.has(m)) issues.add(`"${m}" formatting`)
    }
  }
  return [...issues]
}

function present(spec: SlotSpec, stored: StoredSlot | undefined): string | PortableTextBlock[] | undefined {
  if (!stored) return undefined
  switch (slotFormat(spec)) {
    case 'rich':
      return stored.richValue && stored.richValue.length > 0 ? sanitizeRich(stored.richValue) : undefined
    case 'image':
      return stored.imageUrl || undefined
    default:
      return stored.value != null && stored.value.trim() !== '' ? stored.value : undefined
  }
}

// Each declared slot resolves to its value in the requested locale, then its
// English value, then its default from code. Stored entries for keys the
// manifest doesn't declare are ignored.
export function resolveCopy<S extends Record<string, SlotSpec>>(
  manifest: CopyManifest<S>,
  stored: { requested: Map<string, StoredSlot>; english: Map<string, StoredSlot> }
): ResolvedCopy<S> {
  const out = {} as Record<string, unknown>
  for (const [key, spec] of Object.entries(manifest.slots)) {
    out[key] = present(spec, stored.requested.get(key)) ?? present(spec, stored.english.get(key)) ?? spec.default
  }
  return out as ResolvedCopy<S>
}

// Per-page SEO is stored as three reserved slots (see design D3). Limits are
// checked when editors save, not on values migrated from the live site.
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160
export const DEFAULT_SHARE_IMAGE = '/images/og-default.jpg'

export function seoSlots(defaults: { title: string; description: string; image?: string }) {
  return {
    'seo.title': { label: 'SEO title (browser tab and search results)', default: defaults.title, maxLength: SEO_TITLE_MAX },
    'seo.description': {
      label: 'Meta description (search results)',
      default: defaults.description,
      maxLength: SEO_DESCRIPTION_MAX,
    },
    'seo.image': { label: 'Social share image', format: 'image', default: defaults.image ?? DEFAULT_SHARE_IMAGE },
  } as const satisfies Record<string, SlotSpec>
}
