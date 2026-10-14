import { ageRangeOf, CHILD_AGE_RANGES, type ChildAgeRange } from './content/types'

export interface ChildFilterCriteria {
  nameQuery?: string
  ageRanges?: ChildAgeRange[]
}

export function childMatchesFilters(
  child: { displayName: string; age: number },
  criteria: ChildFilterCriteria
): boolean {
  if (criteria.ageRanges && criteria.ageRanges.length > 0) {
    if (!criteria.ageRanges.includes(ageRangeOf(child.age))) return false
  }
  if (criteria.nameQuery && criteria.nameQuery.trim() !== '') {
    if (!child.displayName.toLowerCase().includes(criteria.nameQuery.trim().toLowerCase())) return false
  }
  return true
}

// The filter state lives in the URL (spec 7.3) so a filtered list can be
// shared: `?name=<text>&age=1-5&age=6-10`.
export function childFiltersFrom(params: URLSearchParams): ChildFilterCriteria {
  const ages = params.getAll('age').filter((a): a is ChildAgeRange => (CHILD_AGE_RANGES as readonly string[]).includes(a))
  return { nameQuery: params.get('name')?.trim() ?? '', ageRanges: ages }
}

export function childFilterParams(criteria: ChildFilterCriteria): URLSearchParams {
  const params = new URLSearchParams()
  if (criteria.nameQuery?.trim()) params.set('name', criteria.nameQuery.trim())
  for (const a of criteria.ageRanges ?? []) params.append('age', a)
  return params
}

export function hasChildFilters(criteria: ChildFilterCriteria): boolean {
  return Boolean(criteria.nameQuery?.trim() || criteria.ageRanges?.length)
}
