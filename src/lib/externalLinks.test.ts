import { describe, expect, it } from 'vitest'
import { isExternalHref, openExternalLinks } from './externalLinks'

const CUE = '(opens in a new tab)'
const open = (html: string) => openExternalLinks(html, CUE)

describe('isExternalHref', () => {
  it('treats other websites as external', () => {
    expect(isExternalHref('https://www.candid.org/profile/123')).toBe(true)
    expect(isExternalHref('http://donorbox.org/x')).toBe(true)
    expect(isExternalHref('//cdn.example.com/a')).toBe(true)
    expect(isExternalHref(' https://instagram.com/vvf ')).toBe(true)
  })

  it('treats the site, anchors and non-web links as not external', () => {
    for (const href of [
      '/ways-to-give',
      '/es/events',
      '#tickets',
      'mailto:info@example.org',
      'tel:+13055550100',
      'https://www.victoriavenezuelafoundation.org/ways-to-give',
      'https://victoriavenezuelafoundation.org/',
      'http://WWW.VictoriaVenezuelaFoundation.org/es',
    ]) {
      expect(isExternalHref(href), href).toBe(false)
    }
  })
})

describe('openExternalLinks', () => {
  it('opens external text links in a new tab with noopener and a hidden cue', () => {
    expect(open('<a href="https://candid.org/p">Candid profile</a>')).toBe(
      '<a href="https://candid.org/p" target="_blank" rel="noopener">Candid profile<span class="sr-only"> (opens in a new tab)</span></a>'
    )
  })

  it('leaves same-site, anchor, mailto and tel links alone', () => {
    const html = '<a href="/contact">Contact</a><a href="#top">Top</a><a href="mailto:a@b.org">Mail</a><a href="tel:1">Call</a><a href="https://www.victoriavenezuelafoundation.org/x">X</a>'
    expect(open(html)).toBe(html)
  })

  it('respects a target the link already sets', () => {
    const html = '<a href="https://example.com" target="_self">Stay</a>'
    expect(open(html)).toBe(html)
  })

  it('merges noopener into an existing rel, once', () => {
    expect(open('<a rel="sponsored" href="https://a.com">A</a>')).toContain('rel="sponsored noopener"')
    expect(open("<a rel='noopener noreferrer' href='https://a.com'>A</a>")).toContain("rel='noopener noreferrer'")
  })

  it('adds the cue to an aria-label instead of hidden text', () => {
    expect(open('<a href="https://instagram.com/vvf" aria-label="Instagram"><svg></svg></a>')).toBe(
      '<a href="https://instagram.com/vvf" aria-label="Instagram (opens in a new tab)" target="_blank" rel="noopener"><svg></svg></a>'
    )
  })

  it('extends an image-named link with hidden text', () => {
    expect(open('<a href="https://sponsor.com" class="logo"><img src="/l.png" alt="Sponsor Co"></a>')).toBe(
      '<a href="https://sponsor.com" class="logo" target="_blank" rel="noopener"><img src="/l.png" alt="Sponsor Co"><span class="sr-only"> (opens in a new tab)</span></a>'
    )
  })

  it('handles single quotes, attribute order, multi-line tags and nested markup', () => {
    const out = open(`<a\n  class='btn'\n  href='https://a.com/x?y=1&amp;z=2'\n><strong>Go</strong> now</a>`)
    expect(out).toContain(`href='https://a.com/x?y=1&amp;z=2'`)
    expect(out).toContain('target="_blank" rel="noopener">')
    expect(out).toContain('<strong>Go</strong> now<span class="sr-only"> (opens in a new tab)</span></a>')
  })

  it('rewrites every link independently', () => {
    const out = open('<a href="/a">A</a> <a href="https://b.com">B</a> <a href="https://c.com">C</a>')
    expect(out.match(/target="_blank"/g)).toHaveLength(2)
    expect(out.startsWith('<a href="/a">A</a>')).toBe(true)
  })

  it('escapes the cue', () => {
    expect(openExternalLinks('<a href="https://a.com">A</a>', '<b>"new" & tab</b>')).toContain('&lt;b&gt;&quot;new&quot; &amp; tab&lt;/b&gt;')
  })
})
