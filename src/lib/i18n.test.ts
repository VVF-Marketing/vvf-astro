import { describe, expect, it } from 'vitest'
import { alternatePaths, localeFromPath, localizePath, stripLocale, toLocale } from './i18n'

describe('toLocale', () => {
  it.each([
    ['es', 'es'],
    ['es-VE', 'es'],
    ['en', 'en'],
    [undefined, 'en'],
    ['fr', 'en'],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(toLocale(input)).toBe(expected)
  })
})

describe('localeFromPath / stripLocale', () => {
  it('detects the /es prefix only as a whole segment', () => {
    expect(localeFromPath('/es')).toBe('es')
    expect(localeFromPath('/es/events/x')).toBe('es')
    expect(localeFromPath('/essentials')).toBe('en')
    expect(localeFromPath('/events')).toBe('en')
  })

  it('strips the prefix', () => {
    expect(stripLocale('/es')).toBe('/')
    expect(stripLocale('/es/')).toBe('/')
    expect(stripLocale('/es/events/x')).toBe('/events/x')
    expect(stripLocale('/events')).toBe('/events')
  })
})

describe('localizePath', () => {
  it('prefixes Spanish paths and leaves English unprefixed', () => {
    expect(localizePath('/ways-to-give', 'es')).toBe('/es/ways-to-give')
    expect(localizePath('/', 'es')).toBe('/es')
    expect(localizePath('/es/ways-to-give', 'en')).toBe('/ways-to-give')
    expect(localizePath('/es/ways-to-give', 'es')).toBe('/es/ways-to-give')
  })

  it('leaves external and non-path links alone', () => {
    expect(localizePath('https://donorbox.org/x', 'es')).toBe('https://donorbox.org/x')
    expect(localizePath('#faq', 'es')).toBe('#faq')
    expect(localizePath('mailto:info@example.org', 'es')).toBe('mailto:info@example.org')
    expect(localizePath('//cdn.example.org/a.png', 'es')).toBe('//cdn.example.org/a.png')
  })
})

describe('alternatePaths', () => {
  it('builds each locale\'s path from its slug', () => {
    expect(alternatePaths('/events', { en: 'golf', es: 'golf-es' })).toEqual({ en: '/events/golf', es: '/es/events/golf-es' })
    expect(alternatePaths('/events', undefined)).toBeUndefined()
  })
})
