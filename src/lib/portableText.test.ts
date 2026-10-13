import { describe, expect, it } from 'vitest'
import { listItemTexts, listItemsWithLead } from './portableText'

const item = (children: { text: string; marks?: string[] }[]) => ({
  _type: 'block',
  listItem: 'bullet',
  children: children.map((c) => ({ _type: 'span', ...c })),
})

describe('portable text readers', () => {
  const blocks = [
    item([{ text: '8:00 AM', marks: ['strong'] }, { text: ' Registration & Breakfast' }]),
    { _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Not a list item' }] },
    item([{ text: 'Complimentary breakfast' }]),
  ]

  it('reads list item text', () => {
    expect(listItemTexts(blocks)).toEqual(['8:00 AM Registration & Breakfast', 'Complimentary breakfast'])
  })

  it('splits the bold lead-in from the rest', () => {
    expect(listItemsWithLead(blocks)).toEqual([
      { lead: '8:00 AM', text: 'Registration & Breakfast' },
      { lead: undefined, text: 'Complimentary breakfast' },
    ])
  })

  it('handles missing content', () => {
    expect(listItemTexts(undefined)).toEqual([])
  })
})
