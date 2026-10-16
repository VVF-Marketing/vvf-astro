import { describe, expect, it } from 'vitest'
import { pageHref, paginate, withPage } from './pagination'

const items = Array.from({ length: 45 }, (_, i) => i)

describe('paginate', () => {
  it('slices one page', () => {
    expect(paginate(items, 2, 20)).toEqual({ items: items.slice(20, 40), page: 2, pages: 3 })
  })

  it('defaults to page 1 and clamps out-of-range or invalid pages', () => {
    expect(paginate(items, null, 20).page).toBe(1)
    expect(paginate(items, '9', 20).page).toBe(3)
    expect(paginate(items, '0', 20).page).toBe(1)
    expect(paginate(items, 'abc', 20).page).toBe(1)
  })

  it('has one page for an empty list', () => {
    expect(paginate([], 1, 6)).toEqual({ items: [], page: 1, pages: 1 })
  })
})

describe('pageHref', () => {
  const url = new URL('https://example.org/children?name=an&page=3')

  it('sets the page and keeps other parameters', () => {
    expect(pageHref(url, 2)).toBe('/children?name=an&page=2')
  })

  it('drops a trailing slash', () => {
    expect(pageHref(new URL('https://example.org/children/'), 2)).toBe('/children?page=2')
  })

  it('drops the parameter for page 1 and appends a hash', () => {
    expect(pageHref(url, 1, '#list')).toBe('/children?name=an#list')
  })
})

describe('withPage', () => {
  it('adds the page from 2 on', () => {
    expect(withPage({ en: '/resources', es: '/es/resources' }, '2')).toEqual({ en: '/resources?page=2', es: '/es/resources?page=2' })
    expect(withPage({ en: '/resources' }, '1')).toEqual({ en: '/resources' })
    expect(withPage({ en: '/resources' }, null)).toEqual({ en: '/resources' })
  })
})
