import { describe, expect, it } from 'vitest'
import { defineCopy, resolveCopy, sanitizeRich, type StoredSlot } from './copy'

const manifest = defineCopy('/ways-to-give', {
  'hero.heading': { label: 'Hero heading', default: 'Ways to give', maxLength: 80 },
  'hero.body': { label: 'Hero text', default: 'Every gift counts.' },
  'faq.intro': { label: 'FAQ intro', format: 'rich', default: [{ _type: 'block', children: [] }] },
  'seo.image': { label: 'Social share image', format: 'image', default: '/images/og-default.jpg' },
})

const slots = (entries: Record<string, StoredSlot>) => new Map(Object.entries(entries))

describe('resolveCopy', () => {
  it('prefers the requested locale, then English, then the default', () => {
    const copy = resolveCopy(manifest, {
      requested: slots({ 'hero.heading': { value: 'Formas de ayudar' } }),
      english: slots({ 'hero.heading': { value: 'Ways to Give' }, 'hero.body': { value: 'Give today.' } }),
    })
    expect(copy['hero.heading']).toBe('Formas de ayudar')
    expect(copy['hero.body']).toBe('Give today.')
    expect(copy['faq.intro']).toEqual([{ _type: 'block', children: [] }])
  })

  it('treats empty or whitespace values as missing', () => {
    const copy = resolveCopy(manifest, {
      requested: slots({ 'hero.heading': { value: '  ' } }),
      english: slots({ 'hero.heading': { value: '' } }),
    })
    expect(copy['hero.heading']).toBe('Ways to give')
  })

  it('reads rich slots from the rich value only', () => {
    const rich = [{ _type: 'block', _key: 'k', style: 'normal', markDefs: [], children: [{ _type: 'span', text: 'Hola', marks: [] }] }]
    const copy = resolveCopy(manifest, {
      requested: slots({ 'faq.intro': { value: 'ignored', richValue: rich } }),
      english: slots({}),
    })
    expect(copy['faq.intro']).toEqual(rich)
  })

  it('ignores stored keys the manifest does not declare', () => {
    const copy = resolveCopy(manifest, {
      requested: slots({ 'injected.banner': { value: '<b>surprise</b>' } }),
      english: slots({}),
    })
    expect(Object.keys(copy)).toEqual(['hero.heading', 'hero.body', 'faq.intro', 'seo.image'])
  })

  it('resolves image slots from the image url, falling back to the default', () => {
    expect(resolveCopy(manifest, { requested: slots({ 'seo.image': { imageUrl: '/es.jpg' } }), english: slots({}) })['seo.image']).toBe('/es.jpg')
    expect(resolveCopy(manifest, { requested: slots({}), english: slots({}) })['seo.image']).toBe('/images/og-default.jpg')
  })
})

describe('sanitizeRich', () => {
  const span = (text: string, marks: string[] = []) => ({ _type: 'span', _key: text, text, marks })

  it('keeps supported styles, lists, decorators and safe links', () => {
    const blocks = [
      { _type: 'block', _key: 'a', style: 'h2', markDefs: [], children: [span('Title')] },
      {
        _type: 'block',
        _key: 'b',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        markDefs: [{ _key: 'l1', _type: 'link', href: 'https://example.org' }],
        children: [span('Bold', ['strong']), span('link', ['l1'])],
      },
    ]
    expect(sanitizeRich(blocks)).toEqual(blocks)
  })

  it('drops unsupported block types, styles, marks and unsafe links', () => {
    const out = sanitizeRich([
      { _type: 'image', _key: 'img', asset: { _ref: 'x' } },
      { _type: 'embed', _key: 'e', url: 'https://evil.example' },
      {
        _type: 'block',
        _key: 'b',
        style: 'h1',
        markDefs: [
          { _key: 'js', _type: 'link', href: 'javascript:alert(1)' },
          { _key: 'cta', _type: 'button', href: '/x' },
        ],
        children: [span('Hi', ['underline', 'js', 'cta', 'em']), { _type: 'inlineWidget', _key: 'w' }],
      },
    ])
    expect(out).toEqual([{ _type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [span('Hi', ['em'])] }])
  })

  it('is applied to stored rich values when resolving copy', () => {
    const copy = resolveCopy(manifest, {
      requested: slots({ 'faq.intro': { richValue: [{ _type: 'embed', _key: 'e' }, { _type: 'block', _key: 'k', style: 'normal', markDefs: [], children: [span('Ok')] }] } }),
      english: slots({}),
    })
    expect(copy['faq.intro']).toEqual([{ _type: 'block', _key: 'k', style: 'normal', markDefs: [], children: [span('Ok')] }])
  })
})
