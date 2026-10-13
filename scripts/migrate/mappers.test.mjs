import { describe, expect, it } from 'vitest'
import { mapChildren, mapCorporateTiers, mapEvents, mapPageFaqs, mapResources, mapTeam, mergePartners, parseLiveDate, slugify } from './mappers.mjs'
import { buildSeeds, createContext } from './transform.mjs'
import { sanitizeRichText, toPlainText, toPortableText } from './lib/richtext.mjs'

const CDN = 'https://cdn.prod.website-files.com/site'
const mediaMap = {
  [`${CDN}/ana.webp`]: { provider: 'local', id: 'm-ana', meta: { storageKey: 'ana.webp' } },
  [`${CDN}/kid.jpg`]: { provider: 'local', id: 'm-kid', meta: { storageKey: 'kid.jpg' } },
  [`${CDN}/inline.png`]: { provider: 'local', id: 'm-inline', meta: { storageKey: 'inline.png' } },
}

describe('helpers', () => {
  it('parses live date formats', () => {
    expect(parseLiveDate('Monday, November 9, 2026')).toBe('2026-11-09T00:00:00.000Z')
    expect(parseLiveDate('December 24, 2012')).toBe('2012-12-24T00:00:00.000Z')
    expect(parseLiveDate('soon')).toBeUndefined()
  })

  it('slugifies names with accents and ampersands', () => {
    expect(slugify('Ron Santa Teresa 1796 & Co.')).toBe('ron-santa-teresa-1796-and-co')
    expect(slugify('Cardénas')).toBe('cardenas')
  })
})

describe('mapTeam', () => {
  const snapshot = {
    sections: [
      {
        tier: 'board',
        members: [
          { slug: 'ana-example', name: 'Ana Example', role: 'Chair', photo: { src: `${CDN}/ana.webp` } },
          { name: 'Join our board', role: 'Seat open', openSeat: { href: '/contact' } },
        ],
      },
      {
        tier: 'staff',
        members: [
          { slug: 'ana-example', name: 'Ana Example', role: 'Executive Director', photo: { src: `${CDN}/ana.webp` } },
          { name: 'Ben Nolink', role: 'Programs' },
        ],
      },
    ],
    members: {
      'ana-example': { name: 'Ana Example', lead: 'Short.', bodyHtml: '<p id="">One.</p><p>Two.</p>', since: '2023', background: [{ label: 'MBA', value: 'Finance' }] },
      'ben-nolink': { name: 'Ben Nolink' },
    },
  }

  it('creates one entry per tier, profile on the first, open seats skipped', () => {
    const ctx = createContext(mediaMap)
    const entries = mapTeam(snapshot, ctx)
    expect(entries.map((e) => [e.id, e.slug, e.data.role, e.data.profile_slug])).toEqual([
      ['team-ana-example-board', 'ana-example', 'Chair', 'ana-example'],
      ['team-ana-example-staff', 'ana-example-staff', 'Executive Director', 'ana-example'],
      ['team-ben-nolink-staff', 'ben-nolink', 'Programs', 'ben-nolink'],
    ])
    expect(entries[0].data).toMatchObject({ bio: 'Short.', long_bio: 'One.\n\nTwo.', since: '2023', photo: { id: 'm-ana' } })
    expect(entries[1].data.long_bio).toBeUndefined()
    expect(ctx.notes.join()).toContain('Join our board')
  })
})

describe('mapChildren', () => {
  it('never fills the private full name and keeps live order', () => {
    const ctx = createContext(mediaMap)
    const [child] = mapChildren(
      {
        order: ['Other C.', 'Test C.'],
        items: [{ slug: 'test-c', displayName: 'Test C.', age: 9, birthday: 'January 2, 2017', gender: 'Female', aboutHtml: '<p>Lives with family.</p>', photo: { src: `${CDN}/kid.jpg` } }],
      },
      ctx
    )
    expect(child).toMatchObject({
      id: 'child-test-c',
      slug: 'test-c',
      data: { display_name: 'Test C.', age: 9, birthday: '2017-01-02T00:00:00.000Z', about: 'Lives with family.', published: true, order: 1, photo: { id: 'm-kid' } },
    })
    expect(child.data).not.toHaveProperty('private_full_name')
  })
})

describe('mapEvents', () => {
  it('maps offers by kind, dedupes sponsors, links FAQs', () => {
    const ctx = createContext(mediaMap)
    const sponsor = { name: 'Sponsor Co', website: 'https://s.example', logo: { src: `${CDN}/s.png` } }
    const out = mapEvents(
      [
        {
          slug: 'golf-2030',
          title: '2030 Golf Tournament',
          dateText: 'Monday, November 4, 2030',
          card: { location: 'Weston, FL', text: 'Card text' },
          donorboxEventId: '123',
          sponsors: [sponsor],
          offers: [
            { id: 'golf-foursome', kind: 'ticket', tierName: 'Foursome', price: '$1,000', benefits: ['Entry for 4'], ctaLabel: 'Buy Tickets', soldOut: false, order: 0 },
            { id: 'golf-spirits', kind: 'special', tierName: 'Spirits Sponsor', price: '$2,500', benefits: ['Bar'], soldOut: true, order: 1 },
          ],
          benefitRows: [{ section: 'Players', name: 'Foursomes', values: ['3'] }],
          programHtml: '<ul><li><strong>8:00 AM</strong> Breakfast</li></ul>',
          faqs: [{ question: 'When?', answer: 'November.' }],
          gallery: [],
          recapStats: [],
        },
        { slug: 'golf-2031', title: 'Golf 2031', dateText: 'November 1, 2031', sponsors: [sponsor], offers: [], benefitRows: [], faqs: [], gallery: [], recapStats: [] },
      ],
      ctx
    )
    const [event] = out.events
    expect(event.data).toMatchObject({
      start_date: '2030-11-04T00:00:00.000Z',
      category: 'golf-tournament',
      sponsor_packages: ['$ref:sp-golf-2030-golf-foursome', '$ref:sp-golf-2030-golf-spirits'],
      benefit_rows: [{ section: 'Players', name: 'Foursomes', values: ['3'] }],
      sponsors: ['$ref:sponsor-sponsor-co'],
    })
    expect(event.data.program[0]).toMatchObject({ _type: 'block', listItem: 'bullet' })
    expect(out.sponsorship_packages.map((p) => [p.data.scope, p.data.kind, p.data.sold_out])).toEqual([
      ['event', 'ticket', false],
      ['event', 'special', true],
    ])
    expect(out.sponsors).toHaveLength(1)
    expect(out.faqs[0]).toMatchObject({ id: 'faq-event-golf-2030-1', data: { category: 'tournament' } })
    expect(ctx.missing.has(`${CDN}/s.png`)).toBe(true)
  })
})

describe('mergePartners', () => {
  it('flags existing event sponsors as partners and adds the rest in order', () => {
    const ctx = createContext({})
    const sponsors = [{ id: 'sponsor-microsoft', status: 'published', data: { name: 'Microsoft' } }]
    const merged = mergePartners(sponsors, [{ name: 'Boeing', website: 'https://boeing.example' }, { name: 'Microsoft' }], ctx)
    expect(merged.map((s) => [s.id, s.data.partner, s.data.order])).toEqual([
      ['sponsor-microsoft', true, 1],
      ['sponsor-boeing', true, 0],
    ])
  })
})

describe('mapCorporateTiers / mapPageFaqs', () => {
  it('maps general tiers and categorised page FAQs', () => {
    expect(mapCorporateTiers([{ tierName: 'Trustee', price: '$2,500/year', recognitionBenefits: ['Plaque'], order: 1 }])[0]).toMatchObject({
      id: 'sp-general-trustee',
      data: { scope: 'general', recognition_benefits: ['Plaque'] },
    })
    const ctx = createContext({})
    const faqs = mapPageFaqs({ 'sponsor-a-child': [{ question: 'Q', answer: 'A' }], unknown: [{ question: 'X', answer: 'Y' }] }, ctx)
    expect(faqs).toEqual([{ id: 'faq-sponsor-a-child-1', status: 'published', data: { question: 'Q', answer: 'A', category: 'sponsorship', order: 1 } }])
    expect(ctx.notes.join()).toContain('unknown')
  })
})

describe('mapResources', () => {
  it('maps dates, authors, Portable Text body with local images, and SEO', () => {
    const ctx = createContext(mediaMap)
    const [r] = mapResources(
      [
        {
          slug: 'report',
          title: 'Report',
          categories: ['financials-transparency'],
          card: { date: 'February 3, 2026', excerpt: 'Ex' },
          updated: 'March 1, 2026',
          authors: [{ name: 'Ana', role: 'CFO' }],
          bodyHtml: `<p>Intro</p><figure class="w-richtext-figure-type-image"><div><img src="${CDN}/inline.png" alt="Chart"></div></figure>`,
          seo: { title: 'Report | VVF', description: 'Desc' },
        },
      ],
      ctx
    )
    expect(r.data).toMatchObject({ published_on: '2026-02-03T00:00:00.000Z', updated_on: '2026-03-01T00:00:00.000Z', seo_title: 'Report | VVF' })
    expect(r.data.body.find((b) => b._type === 'image').asset.url).toBe('/_emdash/api/media/file/inline.png')
  })
})

describe('rich text', () => {
  it('strips Webflow attributes and embeds, reports dropped tags', () => {
    const { html, dropped } = sanitizeRichText('<p id="x" class="w-foo">Hi <iframe src="https://x"></iframe></p><script>bad()</script><h2>T</h2>')
    expect(html).toBe('<p>Hi </p><h2>T</h2>')
    expect(dropped).toEqual(['iframe', 'script'])
  })

  it('drops images that have no local copy', () => {
    expect(sanitizeRichText(`<p><img src="${CDN}/x.png"></p><p>t</p>`, { rewriteSrc: () => undefined }).html).toBe('<p>t</p>')
  })

  it('keeps tables as Portable Text table blocks with deterministic keys', () => {
    const blocks = toPortableText('<p>A</p><table><tr><th>H</th></tr><tr><td>1</td></tr></table><p>B</p>', 'r')
    expect(blocks.map((b) => b._type)).toEqual(['block', 'table', 'block'])
    expect(toPortableText('<p>A</p>', 'r')).toEqual(toPortableText('<p>A</p>', 'r'))
  })

  it('converts to plain paragraphs', () => {
    expect(toPlainText('<p>One &amp; two</p><p>Three<br>four</p>')).toBe('One & two\n\nThree four')
  })
})

describe('buildSeeds', () => {
  it('keeps project-only collections and omits children from the public seed', () => {
    const { full, public: pub } = buildSeeds({
      snapshots: {
        team_members: { sections: [], members: {} },
        children: { order: ['Test C.'], items: [{ slug: 'test-c', displayName: 'Test C.', age: 9 }] },
        events: [],
        corporate_tiers: [],
        faqs: {},
        resources: [],
      },
      mediaMap: {},
      currentSeed: { version: '1', collections: [], content: { posts: [{ id: 'p1' }], auction_items: [{ id: 'old' }] } },
    })
    expect(full.content.children).toHaveLength(1)
    expect(pub.content.children).toEqual([])
    expect(pub.content.posts).toEqual([{ id: 'p1' }])
    expect(pub.content.auction_items).toEqual([])
  })

  it('writes media values only to the local seed', () => {
    const snapshots = {
      team_members: { sections: [{ tier: 'staff', members: [{ slug: 'ana-example', name: 'Ana', role: 'R', photo: { src: `${CDN}/ana.webp` } }] }], members: {} },
      children: { order: [], items: [] },
      events: [],
      corporate_tiers: [],
      faqs: {},
      resources: [],
    }
    const { full, public: pub } = buildSeeds({ snapshots, mediaMap, currentSeed: { version: '1', content: {} } })
    expect(full.content.team_members[0].data.photo).toMatchObject({ id: 'm-ana' })
    expect(pub.content.team_members[0].data.photo).toBeUndefined()
  })
})
