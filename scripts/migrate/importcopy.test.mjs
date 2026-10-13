import { describe, expect, it } from 'vitest'
import { importCopy } from './importcopy.mjs'

function fakeClient(rows) {
  const calls = []
  return {
    calls,
    client: {
      async *listAll(collection) {
        if (collection === 'copy_missing') throw Object.assign(new Error('not found'), { status: 404 })
        for (const r of rows) if (r.collection === collection) yield r
      },
      async update(collection, id, input) {
        calls.push(['update', collection, id, input.data])
      },
      async publish(collection, id) {
        calls.push(['publish', collection, id])
      },
    },
  }
}

const row = (id, key, data = {}, extra = {}) => ({ id, collection: 'copy_home', _rev: 'r', draftRevisionId: null, data: { key, ...data }, ...extra })

describe('importCopy', () => {
  it('fills and publishes empty Spanish slots, plain and rich', async () => {
    const rich = [{ _type: 'block', children: [] }]
    const { client, calls } = fakeClient([row('a', 'hero.heading'), row('b', 'body')])
    const result = await importCopy({ client, translations: { '/': { 'hero.heading': 'Hola', body: rich } } })
    expect(result).toMatchObject({ imported: 2, alreadySet: 0 })
    expect(calls).toEqual([
      ['update', 'copy_home', 'a', { value: 'Hola' }],
      ['publish', 'copy_home', 'a'],
      ['update', 'copy_home', 'b', { rich_value: rich }],
      ['publish', 'copy_home', 'b'],
    ])
  })

  it('never overwrites an editor value or publishes over a draft', async () => {
    const { client, calls } = fakeClient([
      row('a', 'hero.heading', { value: 'Texto del editor' }),
      row('b', 'hero.body', {}, { draftRevisionId: 'd1' }),
    ])
    const result = await importCopy({ client, translations: { '/': { 'hero.heading': 'Hola', 'hero.body': 'Cuerpo' } } })
    expect(result).toMatchObject({ imported: 0, alreadySet: 1, skippedForDraft: 1 })
    expect(calls).toEqual([])
  })

  it('reports translations whose row does not exist yet', async () => {
    const { client } = fakeClient([])
    expect((await importCopy({ client, translations: { '/': { x: 'y' } } })).missingRow).toBe(1)
  })

  it('reads each page from its own copy collection', async () => {
    const { client, calls } = fakeClient([{ ...row('c', 'hero.heading'), collection: 'copy_contact' }, row('h', 'hero.heading')])
    await importCopy({ client, translations: { '/contact': { 'hero.heading': 'Contacto' } } })
    expect(calls).toEqual([
      ['update', 'copy_contact', 'c', { value: 'Contacto' }],
      ['publish', 'copy_contact', 'c'],
    ])
  })
})
