import { describe, expect, it } from 'vitest'
import {
  findAssetUrls,
  parseCorporateTiers,
  parseChild,
  parseChildList,
  parseEvent,
  parseNextPageHref,
  parsePage,
  parseResource,
  parseResourceList,
  parseSeo,
  parseTeamIndex,
  parseTeamMember,
} from './parse.mjs'
import {
  childHtml,
  childListHtml,
  eventHtml,
  resourceHtml,
  resourceListHtml,
  teamIndexHtml,
  teamMemberHtml,
} from '../test/fixtures.mjs'

describe('parseSeo', () => {
  it('reads title, description and og:image from head', () => {
    expect(parseSeo(teamMemberHtml)).toMatchObject({
      title: 'Fixture | Victoria Venezuela Foundation',
      description: 'Fixture description',
      ogImage: 'https://cdn.prod.website-files.com/site/og.png',
    })
  })
})

describe('parseTeamMember', () => {
  it('extracts profile, facts, background and social links', () => {
    const m = parseTeamMember(teamMemberHtml)
    expect(m).toMatchObject({
      name: 'Ana Example',
      role: 'Director',
      quote: 'Ana believes in service.',
      since: '2023',
      from: 'Maracay, VE',
      basedIn: undefined,
      lead: 'Ana leads programs.',
      background: [{ label: 'MBA', value: 'Finance' }],
      socialLinks: [{ platform: 'linkedin', url: 'https://www.linkedin.com/in/ana' }],
    })
    expect(m.photo).toEqual({ src: 'https://cdn.prod.website-files.com/site/ana.webp', alt: 'Ana Example' })
    expect(m.bodyHtml).toContain('Second paragraph.')
  })
})

describe('parseTeamIndex', () => {
  it('groups members by tier with per-tier roles and open seats', () => {
    const [board, staff] = parseTeamIndex(teamIndexHtml)
    expect(board.tier).toBe('board')
    expect(board.members[0]).toMatchObject({ slug: 'ana-example', role: 'Chair', hasDetailPage: true })
    expect(board.members[1]).toMatchObject({ hasDetailPage: false, openSeat: { href: '/contact', cta: 'Get in touch' } })
    expect(staff).toMatchObject({ tier: 'staff', heading: 'Our Team' })
    expect(staff.members[0].role).toBe('Executive Director')
  })
})

describe('parseChild', () => {
  it('extracts labeled fields, about text and the non-icon photo', () => {
    expect(parseChild(childHtml)).toMatchObject({
      displayName: 'Test C.',
      age: 9,
      birthday: 'January 2, 2017',
      gender: 'Female',
      dream: 'She wants to be a teacher.',
      aboutHtml: '<p>Test lives with her family.</p>',
      photo: { src: 'https://cdn.prod.website-files.com/site/child.jpeg' },
    })
  })

  it('reads listing order and pagination', () => {
    expect(parseChildList(childListHtml)).toEqual(['Test A.', 'Test B.'])
    expect(parseNextPageHref(childListHtml)).toBe('?abc_page=2')
  })
})

describe('parseResource', () => {
  it('extracts header, authors, body and PDF download', () => {
    const r = parseResource(resourceHtml)
    expect(r).toMatchObject({
      title: 'Example Report',
      updated: 'March 1, 2026',
      authors: [{ name: 'Ana Example', role: 'Director, VVF' }],
      file: { src: 'https://cdn.prod.website-files.com/site/report.pdf' },
    })
    expect(r.bodyHtml).toContain('<h2>Section</h2>')
  })

  it('extracts listing cards', () => {
    expect(parseResourceList(resourceListHtml)).toEqual([
      {
        slug: 'example-report',
        title: 'Example Report',
        date: 'February 3, 2026',
        excerpt: 'Short excerpt.',
        image: { src: 'https://cdn.prod.website-files.com/site/card.jpeg', alt: 'Card' },
      },
    ])
  })
})

describe('parseEvent', () => {
  it('extracts what/when/where, donorbox id, deduped sponsors and packages', () => {
    const e = parseEvent(eventHtml)
    expect(e).toMatchObject({
      title: '2030 Golf Tournament',
      dateText: 'Monday, November 4, 2030',
      venue: 'The Club',
      address: '1 Course Rd, Weston, FL',
      donorboxEventId: '123456',
    })
    expect(e.sponsors).toEqual([
      { name: 'Sponsor Co', website: 'https://sponsor.example', logo: { src: 'https://cdn.prod.website-files.com/site/sponsor.png', alt: 'Sponsor Co' } },
    ])
    expect(e.offers.map((o) => [o.id, o.kind, o.tierName, o.shortName, o.price, o.benefits, o.ctaLabel, o.soldOut])).toEqual([
      ['golf-foursome', 'ticket', 'Foursome', undefined, '$1,000', ['Entry for 4'], 'Buy Tickets', false],
      ['golf-gold', 'package', 'Gold Sponsor', undefined, '$2,500', undefined, 'Become a Sponsor', false],
      ['golf-lounge', 'special', 'Physical Therapy Lounge', 'PT Lounge', '$1,000', undefined, undefined, true],
    ])
    expect(e.benefitRows).toEqual([{ section: 'Players', name: 'Foursomes', values: ['3', ''] }])
    expect(e.faqs).toEqual([{ question: 'When is it?', answer: 'In November.', order: 0 }])
  })
})

describe('parsePage', () => {
  it('outlines sections without site chrome or staging bars', () => {
    const page = parsePage(resourceHtml)
    const text = JSON.stringify(page.sections)
    expect(text).toContain('Example Report')
    expect(text).not.toContain('Missing SEO fields')
    expect(text).not.toContain('footer_link')
  })
})

describe('findAssetUrls', () => {
  it('collects every Webflow CDN URL once', () => {
    const urls = findAssetUrls(eventHtml)
    expect(urls).toContain('https://cdn.prod.website-files.com/site/sponsor.png')
    expect(urls.filter((u) => u.endsWith('sponsor.png'))).toHaveLength(1)
  })
})

describe('parseChild (Spanish labels)', () => {
  it('reads the Spanish field labels', () => {
    const html = `<section class="section_child-detail"><h1>Ana</h1>
      <h2>Fecha de nacimiento:</h2><p>1 de mayo de 2018</p>
      <h2>Género:</h2><p>Femenino</p>
      <h2>Sueño:</h2><p>Ser doctora</p></section>`
    expect(parseChild(html)).toMatchObject({ displayName: 'Ana', birthday: '1 de mayo de 2018', gender: 'Femenino', dream: 'Ser doctora' })
  })
})

// Review finding (PR #15): the Spanish page labels its benefit groups in
// Spanish, so its tiers came back without benefits.
describe('parseCorporateTiers', () => {
  const page = (labels) => `<div class="w-tabs"><div class="heading-28">Tiers</div>
    <div class="w-tab-menu"><a class="w-tab-link"><h4>Amigo</h4><h6>$250/año</h6></a></div>
    <div class="w-tab-content"><div class="w-tab-pane">
      <div><p>${labels[0]}:</p><ul><li>Inclusión en el informe anual</li></ul></div>
      <div><p>${labels[1]}:</p><ul><li>(25) Pegatinas de la fundación</li></ul></div>
      <div><p>${labels[2]}:</p><ul><li>Participación en la gala anual</li></ul></div>
    </div></div></div>`

  it.each([
    ['English', ['Recognition', 'Promotional items', 'Activities']],
    ['Spanish', ['Reconocimiento', 'Artículos promocionales', 'Actividades']],
  ])('reads the benefit groups labelled in %s', (_, labels) => {
    expect(parseCorporateTiers(page(labels))).toEqual([
      {
        tierName: 'Amigo',
        price: '$250/año',
        recognitionBenefits: ['Inclusión en el informe anual'],
        promotionalBenefits: ['(25) Pegatinas de la fundación'],
        activityBenefits: ['Participación en la gala anual'],
        order: 1,
      },
    ])
  })
})
