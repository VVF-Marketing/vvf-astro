import { describe, expect, it } from 'vitest'
import copy from './_copy'

// Each program statistic names its source, as on the live site.
describe('Our Programs statistics', () => {
  it.each([
    ['nutrition.text', 'Around 45%', 'according to the World Health Organization'],
    ['medical.text', '4.8 million', 'according to the United Nations'],
    ['education.text', 'About 3 million', 'according to UNICEF'],
  ])('%s cites its source', (key, figure, source) => {
    const text = copy.slots[key].default as string
    expect(text).toContain(figure)
    expect(text).toContain(source)
  })

  it('says medical attention days happen twice a year', () => {
    expect(copy.slots['medical.text'].default).toContain('Twice a year')
  })
})
