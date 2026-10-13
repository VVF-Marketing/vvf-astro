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

  it('leaves English pages alone', () => {
    const html = '<a href="/ways-to-give">Give</a>'
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
