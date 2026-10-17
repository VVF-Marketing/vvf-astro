import { describe, expect, it } from 'vitest'
import { childFilterParams, childFiltersFrom, childMatchesFilters } from './childFilter'

const child = { displayName: 'Maria Gonzalez', age: 7 }

describe('childMatchesFilters', () => {
  it('matches with no criteria', () => {
    expect(childMatchesFilters(child, {})).toBe(true)
  })

  it('matches on a case-insensitive, trimmed name substring', () => {
    expect(childMatchesFilters(child, { nameQuery: '  gonzalez  ' })).toBe(true)
    expect(childMatchesFilters(child, { nameQuery: 'MARIA' })).toBe(true)
  })

  it('rejects a non-matching name', () => {
    expect(childMatchesFilters(child, { nameQuery: 'Sofia' })).toBe(false)
  })

  it('ignores a blank/whitespace-only name query', () => {
    expect(childMatchesFilters(child, { nameQuery: '   ' })).toBe(true)
  })

  it('matches when age falls in an included age range', () => {
    expect(childMatchesFilters(child, { ageRanges: ['6-10'] })).toBe(true)
  })

  it('rejects when age falls outside all included age ranges', () => {
    expect(childMatchesFilters(child, { ageRanges: ['1-5', '11-15'] })).toBe(false)
  })

  it('ignores an empty age range list', () => {
    expect(childMatchesFilters(child, { ageRanges: [] })).toBe(true)
  })

  it('requires both name and age range to match when both are given', () => {
    expect(childMatchesFilters(child, { nameQuery: 'Maria', ageRanges: ['6-10'] })).toBe(true)
    expect(childMatchesFilters(child, { nameQuery: 'Maria', ageRanges: ['1-5'] })).toBe(false)
  })

  it('reads and writes the filter state in the URL', () => {
    const criteria = childFiltersFrom(new URLSearchParams('name=Mar&age=1-5&age=bogus&age=16%2B'))
    expect(criteria).toEqual({ nameQuery: 'Mar', ageRanges: ['1-5', '16+'] })
    expect(childFilterParams(criteria).toString()).toBe('name=Mar&age=1-5&age=16%2B')
  })
})
