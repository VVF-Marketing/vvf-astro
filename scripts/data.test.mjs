import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROOT, collectionsToImport, decodeValue, defaultExportPath, encodeValue, isInside, orderRows, orderTables, schemaSeed } from './data.mjs'

describe('export location', () => {
  it('defaults outside the repository', () => {
    expect(isInside(defaultExportPath(new Date('2026-10-05T12:00:00Z')), ROOT)).toBe(false)
    expect(defaultExportPath(new Date('2026-10-05T12:00:00Z'))).toMatch(/vvf-exports\/vvf-2026-10-05T12-00-00-000Z\.tar\.gz$/)
  })

  it('recognizes paths inside the repository', () => {
    expect(isInside(path.join(ROOT, 'exports/x.tar.gz'), ROOT)).toBe(true)
    expect(isInside(path.join(ROOT, '..', 'elsewhere.tar.gz'), ROOT)).toBe(false)
  })
})

describe('value encoding', () => {
  it('round-trips binary and keeps JSON as text for either database', () => {
    const bytes = new Uint8Array([1, 2, 255])
    expect(Buffer.from(decodeValue(encodeValue(bytes)))).toEqual(Buffer.from(bytes))
    expect(encodeValue({ a: [1] })).toBe('{"a":[1]}')
    expect(encodeValue(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05.000Z')
    expect(encodeValue(null)).toBeNull()
    expect(decodeValue('{"$b64":1}')).toBe('{"$b64":1}')
  })
})

describe('ordering', () => {
  it('puts referenced tables first', () => {
    const order = orderTables(['_emdash_fields', '_emdash_collections', 'users', 'credentials', 'menu_items'], [
      { table: '_emdash_fields', ref: '_emdash_collections' },
      { table: 'credentials', ref: 'users' },
      { table: 'menu_items', ref: 'menu_items' },
    ])
    expect(order.indexOf('_emdash_collections')).toBeLessThan(order.indexOf('_emdash_fields'))
    expect(order.indexOf('users')).toBeLessThan(order.indexOf('credentials'))
  })

  it('puts parent rows before their children', () => {
    const rows = [
      { id: 'c', parent_id: 'b' },
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'a' },
    ]
    expect(orderRows(rows, 'id', 'parent_id').map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('schemaSeed', () => {
  it('turns registry rows into a schema-only seed', () => {
    const seed = schemaSeed(
      [{ id: 'c1', slug: 'events', label: 'Events' }],
      [
        { collection_id: 'c1', slug: 'title', label: 'Title', type: 'string', required: 1, unique: 0, indexed: 1, searchable: 0, translatable: 1, sort_order: 0, validation: '{"maxLength":80}' },
        { collection_id: 'other', slug: 'x', label: 'X', type: 'string' },
      ]
    )
    expect(seed.collections).toEqual([
      { slug: 'events', label: 'Events', fields: [expect.objectContaining({ slug: 'title', type: 'string', required: true, indexed: true, translatable: true, validation: { maxLength: 80 } })] },
    ])
  })
})

describe('collectionsToImport', () => {
  const rows = [{ id: '1', slug: 'events' }, { id: '2', slug: 'copy_resources_category_financials_transparency' }]

  it('leaves retired collections out', () => {
    expect(collectionsToImport(rows, 'postgres')).toEqual({ kept: [rows[0]], skipped: ['copy_resources_category_financials_transparency'] })
  })

  it('stops on any other collection name too long for Postgres', () => {
    expect(() => collectionsToImport([{ id: '3', slug: 'copy_a_very_long_collection_name_indeed_x' }], 'postgres')).toThrow(/too long for Postgres/)
    expect(collectionsToImport([{ id: '3', slug: 'copy_a_very_long_collection_name_indeed_x' }], 'sqlite').kept).toHaveLength(1)
  })
})

// Review finding (PR #25): the import only checked for collections before
// replacing the target's tables.
describe('tablesBlockingImport', () => {
  it('allows only what migrations write', async () => {
    const { tablesBlockingImport } = await import('./data.mjs')
    expect(tablesBlockingImport({ _emdash_migrations: 76, options: 1, _emdash_taxonomy_defs: 2, astro_sessions: 3, users: 0 })).toEqual([])
    expect(tablesBlockingImport({ options: 1, users: 1, media: 4 })).toEqual(['users', 'media'])
  })
})
