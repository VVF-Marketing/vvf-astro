import { describe, expect, it } from 'vitest'
import { alignPages, corrected, mergeTables, pageStrings, translate, linkKey } from './align.mjs'

const en = `<html><head><title>Ways to Give | VVF</title><meta name="description" content="Give today."></head>
<body><div class="hero"><h1>Make a gift today</h1><img alt="A smiling girl" src="a.jpg"><a class="button">Donate</a></div>
<div class="list"><p>$25</p><p>Every gift counts.</p></div><script>var x = "ignored"</script></body></html>`

const es = `<html><head><title>Formas de ayudar | VVF</title><meta name="description" content="Dona hoy."></head>
<body><div class="hero"><h1>Haz una donación hoy</h1><img alt="Una niña sonriente" src="a.jpg"><a class="button">Donar</a></div>
<div class="extra"><p>Solo en español</p></div>
<div class="list"><p>$25</p><p>Cada donación cuenta.</p></div></body></html>`

describe('alignPages', () => {
  it('pairs strings at the same element path, skipping extra nodes and unchanged text', () => {
    const table = alignPages(en, es)
    expect(Object.fromEntries(table)).toEqual({
      'Ways to Give | VVF': 'Formas de ayudar | VVF',
      'Give today.': 'Dona hoy.',
      'Make a gift today': 'Haz una donación hoy',
      'A smiling girl': 'Una niña sonriente',
      Donate: 'Donar',
      'Every gift counts.': 'Cada donación cuenta.',
    })
  })

  it('ignores scripts', () => {
    expect(pageStrings(en).some((s) => s.text.includes('ignored'))).toBe(false)
  })
})

describe('translate / mergeTables', () => {
  it('looks up loosely (whitespace, typographic quotes) and merges first-wins', () => {
    const table = mergeTables([new Map([["Child's life", 'Vida del niño']]), new Map([["Child's life", 'otra'], ['Hi', 'Hola']])])
    expect(translate(table, 'Child’s   life')).toBe('Vida del niño')
    expect(translate(table, 'Hi')).toBe('Hola')
    expect(translate(table, 'Missing')).toBeUndefined()
  })
})

// Review finding (PR #15): a menu that differs between the locales (or
// between cached copies) shifted every positional pair after it, swapping
// "Sponsor a Child" and "Ways to Give".
describe('alignPages with menus that differ', () => {
  const page = (links, hero) =>
    `<html><body><nav>${links.map(([href, t]) => `<a class="nav" href="${href}">${t}</a>`).join('')}</nav>` +
    `<div class="hero">${hero.map(([href, t]) => `<a class="btn" href="${href}">${t}</a>`).join('')}</div></body></html>`
  const en = page(
    [['/ways-to-give', 'Ways to Give'], ['/sponsor-a-child', 'Sponsor a Child'], ['/events', 'Events']],
    [['/sponsor-a-child', 'Sponsor a Child'], ['/ways-to-give', 'Ways to Give']]
  )
  const es = page(
    [['/es/sponsor-a-child', 'Apadrina a un niño'], ['/es/ways-to-give', 'Formas de ayudar'], ['/es/corporate', 'Patrocinios'], ['/es/events', 'Eventos']],
    [['/es/sponsor-a-child', 'Apadrina a un niño'], ['/es/ways-to-give', 'Formas de ayudar']]
  )

  it('pairs link text by target and position, not order', () => {
    const t = alignPages(en, es)
    expect(t.get('Sponsor a Child')).toBe('Apadrina a un niño')
    expect(t.get('Ways to Give')).toBe('Formas de ayudar')
    expect(t.get('Events')).toBe('Eventos')
  })

  it('normalizes link targets across locales', () => {
    expect(linkKey('https://www.example.org/es/ways-to-give/')).toBe('/ways-to-give')
    expect(linkKey('/es')).toBe('/')
    expect(linkKey('#top')).toBeUndefined()
    expect(linkKey('mailto:a@b.org')).toBeUndefined()
  })
})

// Review finding (PR #15): the alignment paired "Financials & Transparency"
// with "Nuestro equipo".
describe('corrected', () => {
  it('overrides a pair the alignment got wrong and keeps the rest', () => {
    const table = corrected(new Map([['Financials & Transparency', 'Nuestro equipo'], ['Our Team', 'Nuestro equipo']]))
    expect(translate(table, 'Financials & Transparency')).toBe('Finanzas y transparencia')
    expect(translate(table, 'Our Team')).toBe('Nuestro equipo')
  })

  it('adds the text the live Spanish site never translated', () => {
    expect(translate(corrected(new Map()), 'Children eating a hot meal together in the centre’s dining room.')).toBe(
      'Niños comiendo juntos una comida caliente en el comedor del centro.'
    )
  })
})
