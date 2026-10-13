import { describe, expect, it } from 'vitest'
import { importCopy } from './importcopy.mjs'

function fakeClient(rows) {
  const calls = []
  return {
    calls,
    client: {
      async *listAll() {
        for (const r of rows) yield r
      },
      async update(collection, id, input) {
        calls.push(['update', id, input.data])
      },
      async publish(collection, id) {
        calls.push(['publish', id])
      },
    },
  }
}

const row = (id, key, data = {}, extra = {}) => ({ id, _rev: 'r', draftRevisionId: null, data: { route_path: '/', key, ...data }, ...extra })

describe('importCopy', () => {
  it('fills and publishes empty Spanish slots, plain and rich', async () => {
    const rich = [{ _type: 'block', children: [] }]
    const { client, calls } = fakeClient([row('a', 'hero.heading'), row('b', 'body')])
    const result = await importCopy({ client, translations: { '/': { 'hero.heading': 'Hola', body: rich } } })
    expect(result).toMatchObject({ imported: 2, alreadySet: 0 })
    expect(calls).toEqual([
      ['update', 'a', { value: 'Hola' }],
      ['publish', 'a'],
      ['update', 'b', { rich_value: rich }],
      ['publish', 'b'],
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
})
