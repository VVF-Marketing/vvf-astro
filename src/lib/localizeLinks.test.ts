import { describe, expect, it } from 'vitest'
import { localizeLinks } from './localizeLinks'

describe('localizeLinks', () => {
  it('prefixes internal links on Spanish pages', () => {
    expect(localizeLinks('<a class="btn" href="/ways-to-give">Give</a>', 'es')).toBe(
      '<a class="btn" href="/es/ways-to-give">Give</a>'
    )
    expect(localizeLinks('<a href="/">Home</a>', 'es')).toBe('<a href="/es">Home</a>')
    expect(localizeLinks("<form action='/contact'>", 'es')).toBe("<form action='/es/contact'>")
  })

  it('does not double-prefix', () => {
    expect(localizeLinks('<a href="/es/events">x</a>', 'es')).toBe('<a href="/es/events">x</a>')
  })

  it('keeps English paths on English pages', () => {
    const html = '<a href="/ways-to-give">Give</a>'
    expect(localizeLinks(html, 'en')).toBe(html)
  })

  it('turns full addresses of the site into paths in the page language', () => {
    for (const href of [
      'https://www.victoriavenezuelafoundation.org/ways-to-give',
      'https://victoriavenezuelafoundation.org/ways-to-give',
      'http://victoriavenezuelafoundation.org/ways-to-give',
      '//www.victoriavenezuelafoundation.org/ways-to-give',
    ]) {
      expect(localizeLinks(`<a href="${href}">x</a>`, 'es'), href).toBe('<a href="/es/ways-to-give">x</a>')
      expect(localizeLinks(`<a href="${href}">x</a>`, 'en'), href).toBe('<a href="/ways-to-give">x</a>')
    }
    expect(localizeLinks('<a href="https://victoriavenezuelafoundation.org">Home</a>', 'es')).toBe('<a href="/es">Home</a>')
    expect(localizeLinks('<a href="https://victoriavenezuelafoundation.org/es">Inicio</a>', 'en')).toBe('<a href="/">Inicio</a>')
  })

  it('moves links written in the other language to the page language', () => {
    expect(localizeLinks('<a href="/es/ways-to-give?x=1#top">x</a>', 'en')).toBe('<a href="/ways-to-give?x=1#top">x</a>')
    expect(localizeLinks('<a href="/es">x</a>', 'en')).toBe('<a href="/">x</a>')
    expect(localizeLinks('<a href="/ways-to-give?x=1">x</a>', 'es')).toBe('<a href="/es/ways-to-give?x=1">x</a>')
  })

  it('leaves other sites and site assets as written', () => {
    for (const html of [
      '<a href="https://victoriavenezuelafoundation.org.evil.example/x">x</a>',
      '<a href="https://donorbox.org/vvf">x</a>',
      '<a href="https://www.victoriavenezuelafoundation.org/images/report.pdf">x</a>',
    ]) {
      expect(localizeLinks(html, 'es')).toBe(html)
      expect(localizeLinks(html, 'en')).toBe(html)
    }
  })

  it('keeps the language switch on English pages', () => {
    const html = '<a href="/es/ways-to-give" hreflang="es-VE">ES</a>'
    expect(localizeLinks(html, 'en')).toBe(html)
  })

  it.each([
    '<a href="https://donorbox.org/vvf">x</a>',
    '<a href="//cdn.example.org/x">x</a>',
    '<a href="#faq">x</a>',
    '<a href="mailto:info@example.org">x</a>',
    '<a href="/images/pages/report.pdf">x</a>',
    '<a href="/_emdash/api/media/file/abc">x</a>',
    '<a href="/uploads/x">x</a>',
    '<a href="/ways-to-give" hreflang="en-US">English</a>',
  ])('leaves %s untouched', (html) => {
    expect(localizeLinks(html, 'es')).toBe(html)
  })

  it('only rewrites anchors and forms, not stylesheets or scripts', () => {
    const html = '<link rel="stylesheet" href="/_astro/index.css"><link rel="icon" href="/favicon.ico"><script src="/x.js"></script>'
    expect(localizeLinks(html, 'es')).toBe(html)
  })
})
