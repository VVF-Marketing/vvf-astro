import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPageCopy = vi.fn()
vi.mock('./content', () => ({ getPageCopy: (...args: unknown[]) => getPageCopy(...args) }))

const { getGlobalCopy } = await import('./globalCopy')

describe('getGlobalCopy', () => {
  beforeEach(() => {
    getPageCopy.mockReset()
    getPageCopy.mockResolvedValue({ copy: { 'a11y.newTab': '(abre en una pestaña nueva)' }, locales: ['en', 'es'] })
  })

  it('loads the copy once per request, across the /es rewrite', async () => {
    // The middleware and the rewritten page share `locals` but not the Request.
    const locals = {}
    await getGlobalCopy({ locals, originPathname: '/es/ways-to-give' })
    await getGlobalCopy({ locals, originPathname: '/es/ways-to-give' })
    expect(getPageCopy).toHaveBeenCalledTimes(1)
    expect(getPageCopy).toHaveBeenCalledWith(expect.anything(), 'es')
  })

  it('loads it again for another request', async () => {
    await getGlobalCopy({ locals: {}, originPathname: '/' })
    await getGlobalCopy({ locals: {}, originPathname: '/' })
    expect(getPageCopy).toHaveBeenCalledTimes(2)
  })
})
