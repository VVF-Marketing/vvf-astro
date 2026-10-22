import { beforeEach, describe, expect, it, vi } from 'vitest'

const getEmDashCollection = vi.fn()
const getEmDashEntry = vi.fn()
const getMenu = vi.fn()

vi.mock('emdash', () => ({
  getEmDashCollection: (...args: unknown[]) => getEmDashCollection(...args),
  getEmDashEntry: (...args: unknown[]) => getEmDashEntry(...args),
  getMenu: (...args: unknown[]) => getMenu(...args),
}))

const {
  getEvents,
  getEventBySlug,
  isUpcoming,
  registrationNotice,
  getChildren,
  getChildBySlug,
  getTeamMembers,
  getTeamMemberBySlug,
  getSponsors,
  getSponsorshipPackages,
  getFaqs,
  getCampaignSettings,
  getPrimaryMenu,
  getResources,
  getResourcesByCategory,
  getResource,
  getPartners,
  getPageCopy,
  getReports,
  getTestimonials,
} = await import('./index')
const { defineCopy } = await import('../copy')

function entry(slug: string, data: Record<string, unknown>) {
  return { slug, data }
}

beforeEach(() => {
  getEmDashCollection.mockReset()
  getEmDashEntry.mockReset()
  getMenu.mockReset()
})

describe('getEvents', () => {
  it('maps the content model fields onto the event the pages read', async () => {
    getEmDashCollection.mockImplementation(async (collection: string) => {
      if (collection === 'event_offers') {
        return {
          entries: [
            { id: 'o1', data: { name: 'Gold', kind: 'package', price: '$5,000', sort_order: 1, includes: [{ _type: 'block', children: [{ text: 'Logo on banner' }] }] } },
            { id: 'o2', data: { name: 'Foursome', kind: 'ticket', price: '$1,100', sort_order: 1 } },
          ],
        }
      }
      if (collection === 'benefit_rows') return { entries: [{ id: 'b1', data: { name: 'Banner', section: 'event', sort_order: 1, values: { o1: { check: true } } } }] }
      if (collection === 'events') {
        return {
          entries: [
            entry('golf-2026', {
              name: 'Golf Tournament',
              lifecycle: 'upcoming',
              registration: 'open',
              featured: true,
              start: '2026-06-01',
              summary: 'Annual fundraiser',
              city: 'Doral',
              state: 'FL',
              hero_photo: { src: '/golf.jpg' },
              registration_url: 'https://donorbox.org/events/937157/steps/choose_tickets',
              offers: ['o1', 'o2'],
              benefit_rows: ['b1'],
              meta_description: 'Play golf.',
            }),
          ],
        }
      }
      return { entries: [] }
    })

    const [event] = await getEvents()

    expect(event).toMatchObject({
      slug: 'golf-2026',
      title: 'Golf Tournament',
      startDate: '2026-06-01',
      lifecycle: 'upcoming',
      registration: 'open',
      featured: true,
      location: 'Doral, FL',
      description: 'Annual fundraiser',
      imageUrl: '/golf.jpg',
      donorboxEventId: '937157',
      heroHeading: 'Golf Tournament',
      sponsorPackages: [
        { tierName: 'Gold', price: '$5,000', kind: 'package', benefits: ['Logo on banner'], soldOut: false, order: 1 },
        { tierName: 'Foursome', price: '$1,100', kind: 'ticket', benefits: [], soldOut: false, order: 1 },
      ],
      benefitRows: [{ section: 'event', name: 'Banner', values: ['Yes'] }],
      benefitGrid: { columns: ['Gold'], rows: [{ section: 'event', name: 'Banner', cells: [{ check: true }] }] },
      seo: { description: 'Play golf.', imageUrl: '/golf.jpg' },
    })
  })

  it("maps each recap stat's caption under its label", async () => {
    getEmDashCollection.mockImplementation(async (collection: string) =>
      collection === 'events'
        ? {
            entries: [
              entry('golf-2025', {
                name: 'Golf 2025',
                lifecycle: 'past',
                start: '2025-11-10',
                stats: [
                  { value: '74', label: 'Golfers', caption: 'Took part for children in Venezuela' },
                  { value: '40+', label: 'Sponsors' },
                ],
              }),
            ],
          }
        : { entries: [] }
    )
    const [event] = await getEvents()
    expect(event.recapStats).toEqual([
      { number: '74', heading: 'Golfers', label: 'Took part for children in Venezuela' },
      { number: '40+', heading: 'Sponsors', label: undefined },
    ])
  })

  it('gives event lists the card photo when there is one, keeping the hero photo for the page', async () => {
    getEmDashCollection.mockImplementation(async (collection: string) =>
      collection === 'events'
        ? { entries: [entry('golf-2026', { name: 'Golf', start: '2026-11-09', hero_photo: { src: '/hero.jpg' }, card_photo: { src: '/card.jpg' } })] }
        : { entries: [] }
    )
    const [event] = await getEvents()
    expect(event).toMatchObject({ cardImageUrl: '/card.jpg', imageUrl: '/hero.jpg', heroImageUrl: '/hero.jpg' })
  })

  it('drops a ref id that resolves to no entry instead of throwing', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('e1', { name: 'E', start: '2026-01-01', sponsors: ['missing'] })],
    })
    getEmDashEntry.mockResolvedValue({ entry: undefined })

    const [event] = await getEvents()

    expect(event.sponsors).toEqual([])
  })
})

describe('event appeal and contact fields', () => {
  it('maps the appeal section and contact details', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('golf', {
          name: 'Golf',
          start: '2026-11-09',
          appeal_heading: 'Supports relief',
          appeal_text: 'All proceeds help.',
          appeal_image: { src: '/a.jpg' },
          appeal_image_alt: 'Centre',
          appeal_cards_label: 'Three steps',
          appeal_cards: [{ title: 'Shelter', text: 'A safe place.', image_url: '/s.jpg', image_alt: 'Families' }],
          appeal_cta_label: 'Learn More',
          appeal_cta_url: '/earthquake-relief',
          contact_email: 'golf@example.org',
        }),
      ],
    })
    const [event] = await getEvents()
    expect(event.appeal).toEqual({
      heading: 'Supports relief',
      text: 'All proceeds help.',
      imageUrl: '/a.jpg',
      imageAlt: 'Centre',
      caption: undefined,
      cardsLabel: 'Three steps',
      cards: [{ title: 'Shelter', text: 'A safe place.', imageUrl: '/s.jpg', imageAlt: 'Families' }],
      cta: { label: 'Learn More', href: '/earthquake-relief' },
    })
    expect(event.contact).toEqual({ phone: undefined, email: 'golf@example.org' })
  })

  it('has no appeal or contact when the fields are empty', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [entry('e', { name: 'E', start: '2026-01-01' })] })
    const [event] = await getEvents()
    expect(event.appeal).toBeUndefined()
    expect(event.contact).toBeUndefined()
  })
})

describe('getEventBySlug / isUpcoming', () => {
  it('finds an event by slug among all events', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('a', { name: 'A', start: '2020-01-01' })],
    })
    getEmDashEntry.mockResolvedValue({ entry: undefined })

    expect(await getEventBySlug('a')).toBeDefined()
    expect(await getEventBySlug('missing')).toBeUndefined()
  })

  it('gives an upcoming event with closed or sold-out registration its notice, and nothing else', () => {
    const soon = new Date(Date.now() + 86_400_000).toISOString()
    const past = '2020-01-01'
    expect(registrationNotice({ startDate: soon, registration: 'closed' })).toBe('closed')
    expect(registrationNotice({ startDate: soon, registration: 'sold_out' })).toBe('sold_out')
    expect(registrationNotice({ startDate: soon, registration: 'open' })).toBeNull()
    expect(registrationNotice({ startDate: soon, registration: 'not_needed' })).toBeNull()
    // A recap is past and closed by definition: it gets no notice.
    expect(registrationNotice({ startDate: past, registration: 'closed' })).toBeNull()
    expect(registrationNotice({ startDate: soon, registration: 'closed', lifecycle: 'cancelled' })).toBeNull()
  })

  it('treats a past date as not upcoming', () => {
    expect(isUpcoming({ startDate: '2000-01-01' })).toBe(false)
  })

  it('treats a future date as upcoming', () => {
    expect(isUpcoming({ startDate: '2999-01-01' })).toBe(true)
  })

  it('never lists a cancelled event as upcoming', () => {
    expect(isUpcoming({ startDate: '2999-01-01', lifecycle: 'cancelled' })).toBe(false)
  })
})

describe('getChildren', () => {
  it('requests only available children and maps fields', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('maria', {
          name: 'Maria',
          age: 7,
          gender: 'female',
          photo: { src: '/maria.jpg' },
          sponsorship_status: 'available',
          donorbox_sponsorship_ref: 'ref-1',
        }),
      ],
    })

    const [child] = await getChildren()

    expect(getEmDashCollection).toHaveBeenCalledWith('children', expect.objectContaining({ where: { sponsorship_status: 'available' } }))
    expect(child).toEqual({
      slug: 'maria',
      displayName: 'Maria',
      age: 7,
      birthday: undefined,
      gender: 'Female',
      dream: undefined,
      about: undefined,
      imageUrl: '/maria.jpg',
      imageAlt: undefined,
      published: true,
      sponsorshipStatus: 'available',
      donorboxSponsorshipRef: 'ref-1',
    })
  })
})

describe('getTeamMembers / getTeamMemberBySlug', () => {
  it('filters by group, one record per person, with the role for the section', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('jane', { name: 'Jane', groups: ['board', 'staff'], board_position: 'Chair', title: 'Founder', display_order: 1 }),
        entry('sam', { name: 'Sam', groups: ['staff'], title: 'Director', display_order: 2 }),
      ],
    })
    expect((await getTeamMembers('board')).map((m) => [m.slug, m.role])).toEqual([['jane', 'Chair']])
    expect((await getTeamMembers('staff')).map((m) => [m.slug, m.role])).toEqual([
      ['jane', 'Founder'],
      ['sam', 'Director'],
    ])
  })

  it('finds a bio by slug, never for an open seat', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('jane', { name: 'Jane', groups: ['board'], board_position: 'Chair', bio: [{ _type: 'block', children: [{ text: 'Long' }] }] }),
        entry('join', { name: 'Board seats open', groups: ['board'], open_seat: true }),
      ],
    })
    expect(await getTeamMemberBySlug('jane')).toMatchObject({ name: 'Jane', longBio: 'Long', tier: 'board' })
    expect(await getTeamMemberBySlug('join')).toBeUndefined()
    expect(await getTeamMemberBySlug('missing')).toBeUndefined()
  })
})

// Articles read their category from the categories collection.
function articlesAndCategories(articles: { slug: string; data: Record<string, unknown> }[]) {
  getEmDashCollection.mockImplementation(async (collection: string) => {
    if (collection === 'articles') return { entries: articles }
    if (collection === 'categories') {
      return { entries: [{ id: 'c-stories', slug: 'stories', data: { name: 'Stories' } }, { id: 'c-fin', slug: 'financials', data: { name: 'Financial Reports' } }] }
    }
    if (collection === 'authors') return { entries: [{ id: 'a1', data: { name: 'Ana', role: 'CFO' } }] }
    return { entries: [] }
  })
}

describe('getResources', () => {
  const articles = [
    entry('report', {
      title: 'Report',
      category: 'c-fin',
      publish_date: '2026-02-03',
      authors: ['a1'],
      featured_image: { provider: 'local', id: 'i1', alt: 'Cover', meta: { storageKey: 'cover.png' } },
      report_pdf: { provider: 'local', id: 'f1', meta: { storageKey: 'report.pdf' } },
      body: [{ _type: 'block', children: [] }],
      seo_title: 'Report | VVF',
    }),
    entry('story', { title: 'Story', category: 'c-stories', excerpt: 'Short.' }),
  ]

  it('maps article fields, media URLs and SEO with its fallbacks', async () => {
    articlesAndCategories(articles)
    const [report, story] = await getResources()
    expect(getEmDashCollection).toHaveBeenCalledWith('articles', expect.objectContaining({ orderBy: { publish_date: 'desc' } }))
    expect(report).toMatchObject({
      slug: 'report',
      categories: ['financials-transparency'],
      authors: [{ name: 'Ana', role: 'CFO' }],
      imageUrl: '/_emdash/api/media/file/cover.png',
      imageAlt: 'Cover',
      fileUrl: '/_emdash/api/media/file/report.pdf',
      body: [{ _type: 'block', children: [] }],
      seo: { title: 'Report | VVF', imageUrl: '/_emdash/api/media/file/cover.png' },
    })
    expect(story.seo).toMatchObject({ title: 'Story', description: 'Short.' })
  })

  it('filters by category and finds by slug', async () => {
    articlesAndCategories(articles)
    expect((await getResourcesByCategory('stories')).map((r) => r.slug)).toEqual(['story'])
    expect(await getResource('story')).toMatchObject({ title: 'Story' })
    expect(await getResource('missing')).toBeUndefined()
  })

  it('has no page for an external article', async () => {
    articlesAndCategories([entry('press', { title: 'Press', category: 'c-stories', external: true, external_url: 'https://news.example' })])
    expect(await getResource('press')).toBeUndefined()
    expect((await getResources())[0]).toMatchObject({ external: true, externalUrl: 'https://news.example' })
  })
})

describe('getChildren', () => {
  it('maps the story to the about text', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('test-c', { name: 'Test C.', age: 9, story: [{ _type: 'block', children: [{ text: 'Lives with family.' }] }], sponsorship_status: 'available' })],
    })
    const [child] = await getChildren()
    expect(child).toMatchObject({ about: 'Lives with family.' })
  })
})

describe('getSponsors / getSponsorshipPackages', () => {
  it('maps sponsor fields', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('s1', { name: 'Acme', logo: { src: '/acme.png' }, website_url: 'https://acme.example' })],
    })
    expect(await getSponsors()).toEqual([{ name: 'Acme', logoUrl: '/acme.png', website: 'https://acme.example' }])
  })

  it('lists active partners only, in display order', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    await getPartners()
    expect(getEmDashCollection).toHaveBeenCalledWith('partners', expect.objectContaining({ where: { active: 1 }, orderBy: { display_order: 'asc' } }))
  })

  it('resolves local media (no src) to the EmDash media file URL', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('s1', { name: 'Acme', logo: { provider: 'local', id: 'm1', meta: { storageKey: 'abc.png' } } })],
    })
    expect((await getSponsors())[0].logoUrl).toBe('/_emdash/api/media/file/abc.png')
  })

  it('reads the Corporate Sponsorships tiers in order', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [entry('t1', { tier_name: 'Trustee', price: '$2,500/year', order: 1 })] })
    expect(await getSponsorshipPackages()).toMatchObject([{ tierName: 'Trustee', price: '$2,500/year', order: 1 }])
    expect(getEmDashCollection).toHaveBeenCalledWith('corporate_tiers', expect.objectContaining({ orderBy: { order: 'asc' } }))
  })
})

describe('getFaqs', () => {
  it('lists the questions ticked for a page, in sort order', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('f1', { question: 'Q?', answer: [{ _type: 'block', children: [{ text: 'A.' }] }], shows_on: ['ways_to_give'], sort_order: 1 }),
        entry('f2', { question: 'Other?', answer: 'B.', shows_on: ['sponsor_a_child'], sort_order: 2 }),
      ],
    })
    expect(await getFaqs('donation')).toEqual([{ question: 'Q?', answer: 'A.', category: 'donation', order: 1 }])
    expect(getEmDashCollection).toHaveBeenCalledWith('faqs', expect.objectContaining({ orderBy: { sort_order: 'asc' } }))
  })
})

describe('getCampaignSettings', () => {
  it('falls back to inactive settings when no row exists', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    expect(await getCampaignSettings()).toEqual({ active: false })
  })

  it('maps campaign settings fields when a row exists', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('settings', { active: true, banner_text: 'Live now', donorbox_campaign_id: 'eq-2026' })],
    })
    expect(await getCampaignSettings()).toEqual({
      active: true,
      bannerText: 'Live now',
      donorboxCampaignId: 'eq-2026',
    })
  })
})

describe('getPrimaryMenu', () => {
  it('maps nested menu items recursively', async () => {
    getMenu.mockResolvedValue({
      items: [
        {
          label: 'Get Involved',
          url: '/get-involved',
          children: [{ label: 'Sponsor a Child', url: '/sponsor-a-child', children: [] }],
        },
      ],
    })

    expect(await getPrimaryMenu()).toEqual([
      {
        label: 'Get Involved',
        url: '/get-involved',
        children: [{ label: 'Sponsor a Child', url: '/sponsor-a-child', children: undefined }],
      },
    ])
  })

  // Spec 3.1: the News item shows only while News has an article.
  it('drops the News item while News has no article', async () => {
    const menu = { items: [{ label: 'Resources', url: '#', children: [{ label: 'Stories', url: '/resources/stories', children: [] }, { label: 'News', url: '/resources/news', children: [] }] }] }
    const articles = (withNews: boolean) => async (collection: string) =>
      collection === 'categories'
        ? { entries: [{ id: 'category-news', slug: 'news', data: {} }] }
        : collection === 'articles' && withNews
          ? { entries: [entry('press-a', { title: 'Nota', category: 'category-news', external: true, external_url: 'https://outlet.example/a' })] }
          : { entries: [] }
    getMenu.mockResolvedValue(menu)
    getEmDashCollection.mockImplementation(articles(false))
    expect((await getPrimaryMenu())[0].children?.map((c) => c.label)).toEqual(['Stories'])
    getEmDashCollection.mockImplementation(articles(true))
    expect((await getPrimaryMenu())[0].children?.map((c) => c.label)).toEqual(['Stories', 'News'])
  })

  it('returns an empty menu when none is configured', async () => {
    getMenu.mockResolvedValue(null)
    expect(await getPrimaryMenu()).toEqual([])
  })
})

describe('locale resolution', () => {
  // Rows as EmDash returns them: system columns live in `data`.
  function row(slug: string, locale: string, group: string, data: Record<string, unknown>) {
    return { slug, data: { ...data, locale, translationGroup: group } }
  }

  function byLocale(rows: Record<string, ReturnType<typeof row>[]>) {
    getEmDashCollection.mockImplementation(async (_collection: string, filter: { locale?: string }) => ({
      entries: rows[filter.locale ?? 'en'] ?? [],
    }))
  }

  it('always passes the locale explicitly to EmDash', async () => {
    byLocale({ en: [] })
    await getEvents()
    expect(getEmDashCollection).toHaveBeenCalledWith('events', expect.objectContaining({ locale: 'en' }))
  })

  it('serves the Spanish version when one exists, English otherwise, in English order', async () => {
    byLocale({
      en: [
        row('golf-2026', 'en', 'g1', { name: 'Golf', start: '2026-06-01' }),
        row('gala-2026', 'en', 'g2', { name: 'Gala', start: '2026-09-01' }),
      ],
      es: [row('golf-2026-es', 'es', 'g1', { name: 'Golf ES', start: '2026-06-01' })],
    })
    getEmDashEntry.mockResolvedValue({ entry: undefined })

    const events = await getEvents('es')

    expect(events.map((e) => [e.slug, e.title, e.fallbackLocale])).toEqual([
      ['golf-2026-es', 'Golf ES', undefined],
      ['gala-2026', 'Gala', 'en'],
    ])
  })

  it('hides a translation whose English entry is not live', async () => {
    // EmDash only returns published rows, so an unpublished English entry is
    // simply absent from the English query.
    byLocale({
      en: [],
      es: [row('solo-es', 'es', 'g9', { question: '¿Qué?', answer: 'Esto', category: 'general' })],
    })

    expect(await getFaqs(undefined, 'es')).toEqual([])
  })

  it('takes a child profile down in Spanish when it is hidden in English', async () => {
    // The English profile isn't live (EmDash returns only published rows);
    // its Spanish row alone shows nothing.
    byLocale({
      en: [],
      es: [row('ana', 'es', 'c1', { name: 'Ana', sponsorship_status: 'available' })],
    })

    expect(await getChildren('es')).toEqual([])
    expect(await getChildBySlug('ana', 'es')).toBeUndefined()
  })

  it('finds a detail entry by its Spanish slug or its English counterpart slug', async () => {
    byLocale({
      en: [row('impact-report', 'en', 'r1', { title: 'Impact Report' })],
      es: [row('informe-de-impacto', 'es', 'r1', { title: 'Informe de impacto' })],
    })

    expect((await getResource('informe-de-impacto', 'es'))?.title).toBe('Informe de impacto')
    expect((await getResource('impact-report', 'es'))?.title).toBe('Informe de impacto')
  })

  it('falls back to the English entry, then to not-found', async () => {
    byLocale({ en: [row('impact-report', 'en', 'r1', { title: 'Impact Report' })], es: [] })

    const fallback = await getResource('impact-report', 'es')
    expect(fallback?.title).toBe('Impact Report')
    expect(fallback?.fallbackLocale).toBe('en')
    expect(await getResource('missing', 'es')).toBeUndefined()
  })

  it('resolves references to their Spanish translation', async () => {
    getEmDashCollection.mockImplementation(async (collection: string, filter: { locale?: string }) => {
      if (collection === 'events') {
        return {
          entries:
            filter.locale === 'en'
              ? [row('golf', 'en', 'g1', { name: 'Golf', start: '2026-06-01', sponsors: ['s1'] })]
              : [],
        }
      }
      if (collection === 'partners') {
        return {
          entries:
            filter.locale === 'es'
              ? [row('acme-es', 'es', 'sg1', { name: 'Acme (ES)' })]
              : [{ id: 's1', ...row('acme', 'en', 'sg1', { name: 'Acme' }) }],
        }
      }
      return { entries: [] }
    })

    const [event] = await getEvents('es')

    expect(event.sponsors).toEqual([{ name: 'Acme (ES)', logoUrl: undefined, website: undefined }])
  })

  it('finds a translated team profile by its English profile slug', async () => {
    byLocale({
      en: [row('jane-doe', 'en', 't1', { name: 'Jane', board_position: 'Chair', groups: ['board'] })],
      es: [row('jane-doe-es', 'es', 't1', { name: 'Jane', board_position: 'Presidenta', groups: ['board'] })],
    })

    expect((await getTeamMemberBySlug('jane-doe', 'es'))?.role).toBe('Presidenta')
    expect((await getTeamMemberBySlug('jane-doe-es', 'es'))?.role).toBe('Presidenta')
    expect(await getTeamMemberBySlug('nobody', 'es')).toBeUndefined()
  })

  it('reports a detail entry\'s slug in every locale it exists in, from either locale', async () => {
    byLocale({
      en: [row('impact-report', 'en', 'r1', { title: 'Impact Report' }), row('only-en', 'en', 'r2', { title: 'Only EN' })],
      es: [row('informe-de-impacto', 'es', 'r1', { title: 'Informe de impacto' })],
    })

    expect((await getResource('impact-report'))?.alternates).toEqual({ en: 'impact-report', es: 'informe-de-impacto' })
    expect((await getResource('informe-de-impacto', 'es'))?.alternates).toEqual({
      en: 'impact-report',
      es: 'informe-de-impacto',
    })
    expect((await getResource('only-en', 'es'))?.alternates).toEqual({ en: 'only-en' })
  })

  it('reports a team member\'s profile slug per locale', async () => {
    byLocale({
      en: [row('jane-doe', 'en', 't1', { name: 'Jane', board_position: 'Chair', groups: ['board'] })],
      es: [row('jane-doe-es', 'es', 't1', { name: 'Jane', board_position: 'Presidenta', groups: ['board'] })],
    })

    expect((await getTeamMemberBySlug('jane-doe'))?.alternates).toEqual({ en: 'jane-doe', es: 'jane-doe-es' })
  })

  it('asks EmDash for the menu in the requested locale', async () => {
    getMenu.mockResolvedValue(null)
    await getPrimaryMenu('es')
    expect(getMenu).toHaveBeenCalledWith('primary', { locale: 'es' })
  })
})

describe('getPageCopy', () => {
  const manifest = defineCopy('/ways-to-give', {
    'seo.title': { label: 'SEO title', default: 'Ways to Give' },
    'hero.heading': { label: 'Hero heading', default: 'Ways to give' },
    'hero.body': { label: 'Hero text', default: 'Every gift counts.' },
  })

  function copyRows(rows: Record<string, { key: string; value: string }[]>) {
    getEmDashCollection.mockImplementation(async (collection: string, filter: { locale?: string; where?: unknown }) => {
      expect(collection).toBe('copy_ways_to_give')
      expect(filter.where).toBeUndefined()
      return { entries: (rows[filter.locale ?? 'en'] ?? []).map((d) => ({ slug: d.key, data: d })) }
    })
  }

  it('resolves slots with es -> en -> default fallback, and counts the page as Spanish once its SEO title is', async () => {
    copyRows({
      en: [{ key: 'hero.heading', value: 'Ways to Give' }],
      es: [
        { key: 'seo.title', value: 'Formas de ayudar | VVF' },
        { key: 'hero.heading', value: 'Formas de ayudar' },
      ],
    })
    const { copy, locales } = await getPageCopy(manifest, 'es')
    expect(copy).toEqual({ 'seo.title': 'Formas de ayudar | VVF', 'hero.heading': 'Formas de ayudar', 'hero.body': 'Every gift counts.' })
    expect(locales).toEqual(['en', 'es'])
  })

  it('reports English only while the Spanish SEO title is empty, even with other Spanish text', async () => {
    copyRows({
      en: [{ key: 'hero.heading', value: 'Ways to Give' }],
      es: [
        { key: 'seo.title', value: ' ' },
        { key: 'hero.heading', value: 'Formas de ayudar' },
      ],
    })
    const { copy, locales } = await getPageCopy(manifest, 'es')
    expect(copy['hero.heading']).toBe('Formas de ayudar')
    expect(locales).toEqual(['en'])
  })

  it('renders defaults when the page has no copy collection yet', async () => {
    // EmDash returns no entries for a collection whose table doesn't exist.
    getEmDashCollection.mockResolvedValue({ entries: [] })
    const { copy, locales } = await getPageCopy(manifest, 'es')
    expect(copy).toEqual({ 'seo.title': 'Ways to Give', 'hero.heading': 'Ways to give', 'hero.body': 'Every gift counts.' })
    expect(locales).toEqual(['en'])
  })
})

describe('query failures', () => {
  // EmDash returns database errors as `error` with no entries, instead of throwing.
  const failure = { entries: [], error: new Error('Failed to load collection: connection refused') }

  it('fail the page instead of rendering default copy', async () => {
    getEmDashCollection.mockResolvedValue(failure)
    await expect(getPageCopy(defineCopy('/ways-to-give', { 'hero.heading': { label: 'Heading', default: 'Ways to give' } }), 'es')).rejects.toThrow(
      'connection refused'
    )
  })

  it('fail the page instead of rendering an empty list', async () => {
    getEmDashCollection.mockResolvedValue(failure)
    await expect(getReports('annual')).rejects.toThrow('connection refused')
  })
})

describe('getReports / getTestimonials', () => {
  it('lists financial reports of one kind, newest first as queried', async () => {
    articlesAndCategories([
      entry('impact-report-2025', { title: 'Impact Report 2025', category: 'c-fin', report_type: 'annual' }),
      entry('your-impact-1q2025', { title: 'Your Impact 1Q2025', category: 'c-fin', report_type: 'quarterly' }),
      entry('story', { title: 'A story', category: 'c-stories' }),
    ])
    expect((await getReports('annual')).map((r) => r.slug)).toEqual(['impact-report-2025'])
    expect((await getReports('quarterly')).map((r) => r.slug)).toEqual(['your-impact-1q2025'])
  })

  it('maps testimonials', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [entry('t', { quote: 'Q', name: 'N', role: 'R', photo: { src: '/p.jpg' } })] })
    expect(await getTestimonials()).toEqual([{ quote: 'Q', name: 'N', role: 'R', imageUrl: '/p.jpg' }])
  })
})

// Review finding (PR #13): each reference was fetched with its own query.
describe('reference resolution', () => {
  it('reads each referenced collection once, however many references', async () => {
    getEmDashCollection.mockImplementation(async (collection: string) => {
      if (collection === 'events') {
        return { entries: [entry('a', { name: 'A', start: '2026-01-01', sponsors: ['s1', 's2'] }), entry('b', { name: 'B', start: '2026-02-01', sponsors: ['s2'] })] }
      }
      if (collection === 'partners') {
        return { entries: [{ id: 's1', slug: 'one', data: { name: 'One' } }, { id: 's2', slug: 'two', data: { name: 'Two' } }] }
      }
      return { entries: [] }
    })
    const events = await getEvents()
    expect(events.map((e) => e.sponsors?.map((s) => s.name))).toEqual([['One', 'Two'], ['Two']])
    expect(getEmDashEntry).not.toHaveBeenCalled()
  })
})

