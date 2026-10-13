import { describe, expect, it } from 'vitest'
import { mapChildren, mapCorporateTiers, mapEvents, mapPageFaqs, mapResources, mapTeam, mergePartners, parseLiveDate, slugify } from './mappers.mjs'
import { alignSponsorNames, buildSeeds, createContext, pageCopyEntries, translatedEntries } from './transform.mjs'
import { relativizeSameSiteLinks } from '../../src/lib/site.mjs'
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
  // Review finding (PR #15): Spanish events showed the English photo
  // descriptions harvested with the media.
  it("describes each event photo in its own page's language", () => {
    const harvested = { [`${CDN}/golf.jpg`]: { provider: 'local', id: 'm-golf', alt: 'Three golfers on the green.' } }
    const spanish = { src: `${CDN}/golf.jpg`, alt: 'Tres golfistas en el green.' }
    const page = { slug: 'golf', title: 'Golf', dateText: 'November 1, 2031', heroImage: spanish, sponsors: [], offers: [], benefitRows: [], faqs: [], gallery: [spanish], recapStats: [] }
    const [event] = mapEvents([page], createContext(harvested)).events
    expect(event.data.hero_image).toEqual({ provider: 'local', id: 'm-golf', alt: 'Tres golfistas en el green.' })
    expect(event.data.image.alt).toBe('Tres golfistas en el green.')
    expect(event.data.gallery[0].alt).toBe('Tres golfistas en el green.')
    expect(harvested[`${CDN}/golf.jpg`].alt).toBe('Three golfers on the green.')
  })

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

describe('translatedEntries', () => {
  const e = (id, slug, data) => ({ id, ...(slug ? { slug } : {}), status: 'published', data })

  it('pairs by id, falls back to position, remaps refs and keeps English data the Spanish page lacks', () => {
    const live = {
      events: [e('event-golf', 'golf', { title: 'Golf', start_date: '2026-11-09', sponsor_packages: ['$ref:sp-golf-gold'], appeal_heading: 'Supports relief' })],
      sponsorship_packages: [e('sp-general-leader', undefined, { tier_name: 'Leader', price: '$1,000' })],
    }
    const liveEs = {
      events: [e('event-golf', 'golf', { title: 'Golf ES', sponsor_packages: ['$ref:sp-golf-oro'], appeal_heading: 'Supports relief' })],
      sponsorship_packages: [e('sp-general-lider', undefined, { tier_name: 'Líder' })],
    }
    const { entries, unpaired } = translatedEntries(live, liveEs, new Map([['Supports relief', 'Apoya el alivio']]))
    expect(unpaired).toEqual([])
    expect(entries.events[0]).toEqual({
      id: 'event-golf--es',
      slug: 'golf',
      status: 'published',
      locale: 'es',
      translationOf: 'event-golf',
      data: { title: 'Golf ES', start_date: '2026-11-09', sponsor_packages: ['$ref:sp-golf-oro'], appeal_heading: 'Apoya el alivio' },
    })
    expect(entries.sponsorship_packages[0]).toMatchObject({
      translationOf: 'sp-general-leader',
      data: { tier_name: 'Líder', price: '$1,000' },
    })
  })

  it('uses the chosen Spanish term over the live one (Trustee → Benefactor)', () => {
    const live = { sponsorship_packages: [e('sp-general-trustee', undefined, { tier_name: 'Trustee' })] }
    const liveEs = { sponsorship_packages: [e('sp-general-patrocinador', undefined, { tier_name: 'Patrocinador' })] }
    expect(translatedEntries(live, liveEs).entries.sponsorship_packages[0].data.tier_name).toBe('Benefactor')
  })

  it('remaps a reference to the English id of a positionally paired entry', () => {
    const live = { a: [e('sp-x-gold', undefined, {})], b: [e('ev', 'ev', { refs: ['$ref:sp-x-gold'] })] }
    const liveEs = { a: [e('sp-x-oro', undefined, {})], b: [e('ev', 'ev', { refs: ['$ref:sp-x-oro'] })] }
    expect(translatedEntries(live, liveEs).entries.b[0].data.refs).toEqual(['$ref:sp-x-gold'])
  })

  it('reports English entries without a Spanish version', () => {
    const { entries, unpaired } = translatedEntries({ faqs: [e('faq-1', undefined, {}), e('faq-2', undefined, {})] }, { faqs: [e('faq-1', undefined, {})] })
    expect(entries.faqs).toHaveLength(1)
    expect(unpaired).toEqual(['faqs: faq-2'])
  })
})

describe('pageCopyEntries', () => {
  it('emits an English entry with the default and a linked Spanish entry with the translation', () => {
    const manifests = [
      {
        route: '/ways-to-give',
        slots: {
          'hero.heading': { label: 'Hero: heading', default: 'Ways to give', maxLength: 30 },
          'seo.image': { label: 'Share image', format: 'image', default: '/og.jpg' },
        },
      },
    ]
    const entries = pageCopyEntries(manifests, { '/ways-to-give': { 'hero.heading': 'Formas de ayudar' } })
    expect(entries).toEqual([
      {
        id: 'copy--ways-to-give--hero.heading',
        status: 'published',
        data: { route_path: '/ways-to-give', key: 'hero.heading', label: 'Hero: heading', format: 'plain', max_length: 30, stale: false, value: 'Ways to give' },
      },
      {
        id: 'copy--ways-to-give--hero.heading--es',
        status: 'published',
        locale: 'es',
        translationOf: 'copy--ways-to-give--hero.heading',
        data: { route_path: '/ways-to-give', key: 'hero.heading', label: 'Hero: heading', format: 'plain', max_length: 30, stale: false, value: 'Formas de ayudar' },
      },
      {
        id: 'copy--ways-to-give--seo.image',
        status: 'published',
        data: { route_path: '/ways-to-give', key: 'seo.image', label: 'Share image', format: 'image', max_length: undefined, stale: false, image_value: { src: '/og.jpg' } },
      },
      {
        id: 'copy--ways-to-give--seo.image--es',
        status: 'published',
        locale: 'es',
        translationOf: 'copy--ways-to-give--seo.image',
        data: { route_path: '/ways-to-give', key: 'seo.image', label: 'Share image', format: 'image', max_length: undefined, stale: false },
      },
    ])
  })
})

describe('relativizeSameSiteLinks', () => {
  it('rewrites links to the site as paths and leaves text and other sites alone', () => {
    const data = {
      cta_url: 'https://www.victoriavenezuelafoundation.org/ways-to-give',
      website: 'https://donorbox.org/x',
      body: [
        {
          _type: 'block',
          markDefs: [{ _key: 'l', _type: 'link', href: 'https://victoriavenezuelafoundation.org' }],
          children: [{ _type: 'span', text: 'https://victoriavenezuelafoundation.org', marks: ['l'] }],
        },
      ],
    }
    expect(relativizeSameSiteLinks(data)).toEqual({
      ...data,
      cta_url: '/ways-to-give',
      body: [{ ...data.body[0], markDefs: [{ _key: 'l', _type: 'link', href: '/' }] }],
    })
  })
})

// Review finding (PR #15): the Spanish golf events pointed at
// `sponsor-el-manitas-de-confianza`, a translated company name.
describe('alignSponsorNames', () => {
  it('keeps the English name for a Spanish sponsor with the same logo', () => {
    const en = [{ sponsors: [{ name: 'The Trusty Handyman', logo: { src: 'https://cdn/x/handyman.png' } }] }]
    const es = [{ sponsors: [{ name: 'El manitas de confianza', logo: { src: 'https://cdn/x/handyman.png' } }, { name: 'Nuevo', logo: { src: 'https://cdn/x/new.png' } }] }]
    expect(alignSponsorNames(en, es)[0].sponsors.map((s) => s.name)).toEqual(['The Trusty Handyman', 'Nuevo'])
  })
})

