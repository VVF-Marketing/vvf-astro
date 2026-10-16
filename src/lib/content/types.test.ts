import { describe, expect, it } from 'vitest'
import { ageRangeOf } from './types'

describe('ageRangeOf', () => {
  it.each([
    [1, '1-5'],
    [5, '1-5'],
    [6, '6-10'],
    [10, '6-10'],
    [11, '11-15'],
    [15, '11-15'],
    [16, '16+'],
    [30, '16+'],
  ] as const)('maps age %i to range %s', (age, expected) => {
    expect(ageRangeOf(age)).toBe(expected)
  })
})
