import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { COPY_PAGES, copyCollectionFor } from './cmsNavigation.mjs'

// EmDash names each collection's table, keys and indexes after its slug, and
// Postgres truncates identifiers at 63 characters (SQLite doesn't). Names
// that collide after truncation make the schema fail to apply on Postgres
// (openspec/changes/make-app-portable, design D10). Suffixes are the ones
// EmDash 0.38 creates for every collection (read from a migrated Postgres).
const PG_IDENTIFIER_LIMIT = 63
const INDEX_SUFFIXES = [
  'author', 'del_sched', 'del_tg_locale', 'deleted_created_id', 'deleted_published_id', 'deleted_status',
  'deleted_updated_id', 'draft_revision', 'live_revision', 'loc_crt', 'loc_upd', 'locale', 'primary_byline', 'slug', 'tg_locale',
]
const KEY_SUFFIXES = ['pkey', 'slug_locale_unique', 'live_revision_id_fkey', 'draft_revision_id_fkey']

function emdashIdentifiers(slug: string): string[] {
  return [`ec_${slug}`, ...INDEX_SUFFIXES.map((s) => `idx_ec_${slug}_${s}`), ...KEY_SUFFIXES.map((s) => `ec_${slug}_${s}`)]
}

const seed = JSON.parse(readFileSync(path.join(process.cwd(), 'seed/seed.json'), 'utf8')) as { collections: { slug: string }[] }
const slugs = [...new Set([...seed.collections.map((c) => c.slug), ...COPY_PAGES.map((p) => copyCollectionFor(p.route))])]

describe('collection names fit Postgres', () => {
  it.each(slugs)('%s keeps every EmDash identifier within 63 characters', (slug) => {
    const tooLong = emdashIdentifiers(slug).filter((n) => n.length > PG_IDENTIFIER_LIMIT)
    expect(tooLong).toEqual([])
  })

  it('has no two identifiers that collide after truncation', () => {
    const all = slugs.flatMap(emdashIdentifiers).map((n) => n.slice(0, PG_IDENTIFIER_LIMIT))
    expect(all.length - new Set(all).size).toBe(0)
  })

  it('catches the slug that broke Postgres', () => {
    const names = emdashIdentifiers('copy_resources_category_financials_transparency').map((n) => n.slice(0, PG_IDENTIFIER_LIMIT))
    expect(names.length - new Set(names).size).toBeGreaterThan(0)
  })

  it('uses the short slug for the Financials resources category', () => {
    expect(copyCollectionFor('/resources/category/financials-transparency')).toBe('copy_resources_financials')
  })
})
