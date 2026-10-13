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
  getChildren,
  getTeamMembers,
  getTeamMemberBySlug,
  getPosts,
  getFeaturedPosts,
  getSponsors,
  getSponsorshipPackages,
  getFaqs,
  getCampaignUpdates,
  getCampaignSettings,
  getPrimaryMenu,
  getResources,
  getResourcesByCategory,
  getResource,
  getPartners,
} = await import('./index')

function entry(slug: string, data: Record<string, unknown>) {
  return { slug, data }
}

beforeEach(() => {
  getEmDashCollection.mockReset()
  getEmDashEntry.mockReset()
  getMenu.mockReset()
})

describe('getEvents', () => {
  it('maps snake_case fields to camelCase and resolves image/refs', async () => {
    getEmDashCollection.mockImplementation(async (collection: string) => {
      if (collection === 'events') {
        return {
          entries: [
            entry('golf-2026', {
              title: 'Golf Tournament',
              start_date: '2026-06-01',
              location: 'Doral, FL',
              description: 'Annual fundraiser',
              image: { src: '/golf.jpg' },
              category: 'golf-tournament',
              donorbox_event_id: 'golf-2026',
              sponsor_packages: ['sp-1'],
              auction_items: [],
              sponsors: [],
            }),
          ],
        }
      }
      return { entries: [] }
    })
    getEmDashEntry.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'sponsorship_packages' && id === 'sp-1') {
        return { entry: { data: { tier_name: 'Gold', price: '$5,000', order: 1 } } }
      }
      return { entry: undefined }
    })

    const [event] = await getEvents()

    expect(event).toEqual({
      slug: 'golf-2026',
      title: 'Golf Tournament',
      startDate: '2026-06-01',
      location: 'Doral, FL',
      description: 'Annual fundraiser',
      imageUrl: '/golf.jpg',
      category: 'golf-tournament',
      donorboxEventId: 'golf-2026',
      sponsorPackages: [{ tierName: 'Gold', price: '$5,000', order: 1, soldOut: false }],
      auctionItems: undefined,
      sponsors: undefined,
    })
  })

  it('drops a ref id that resolves to no entry instead of throwing', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('e1', { title: 'E', start_date: '2026-01-01', location: 'X', sponsors: ['missing'] })],
    })
    getEmDashEntry.mockResolvedValue({ entry: undefined })

    const [event] = await getEvents()

    expect(event.sponsors).toEqual([])
  })
})

describe('getEventBySlug / isUpcoming', () => {
  it('finds an event by slug among all events', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('a', { title: 'A', start_date: '2020-01-01', location: 'X' })],
    })
    getEmDashEntry.mockResolvedValue({ entry: undefined })

    expect(await getEventBySlug('a')).toBeDefined()
    expect(await getEventBySlug('missing')).toBeUndefined()
  })

  it('treats a past date as not upcoming', () => {
    expect(isUpcoming({ startDate: '2000-01-01' })).toBe(false)
  })

  it('treats a future date as upcoming', () => {
    expect(isUpcoming({ startDate: '2999-01-01' })).toBe(true)
  })
})

describe('getChildren', () => {
  it('requests only published children and maps fields', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('maria', {
          display_name: 'Maria',
          age: 7,
          photo: { src: '/maria.jpg' },
          published: true,
          donorbox_sponsorship_ref: 'ref-1',
        }),
      ],
    })

    const [child] = await getChildren()

    expect(getEmDashCollection).toHaveBeenCalledWith(
      'children',
      expect.objectContaining({ where: { published: true } })
    )
    expect(child).toEqual({
      slug: 'maria',
      displayName: 'Maria',
      age: 7,
      birthday: undefined,
      gender: undefined,
      dream: undefined,
      imageUrl: '/maria.jpg',
      published: true,
      donorboxSponsorshipRef: 'ref-1',
    })
  })
})

describe('getTeamMembers / getTeamMemberBySlug', () => {
  it('filters by tier when one is given', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    await getTeamMembers('board')
    expect(getEmDashCollection).toHaveBeenCalledWith('team_members', expect.objectContaining({ where: { tier: 'board' } }))
  })

  it('finds one profile per person across tiers, preferring the entry with the long bio', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('jane', { name: 'Jane', role: 'Chair', tier: 'board', profile_slug: 'jane' }),
        entry('jane-staff', { name: 'Jane', role: 'Founder', tier: 'staff', profile_slug: 'jane', long_bio: 'Long' }),
        entry('sam', { name: 'Sam', role: 'Director', tier: 'staff', profile_slug: 'sam' }),
        entry('no-profile', { name: 'Volunteer', role: 'Helper', tier: 'staff' }),
      ],
    })

    expect(await getTeamMemberBySlug('jane')).toMatchObject({ slug: 'jane-staff', longBio: 'Long' })
    expect(await getTeamMemberBySlug('sam')).toMatchObject({ name: 'Sam', tier: 'staff' })
    expect(await getTeamMemberBySlug('no-profile')).toBeUndefined()
    expect(await getTeamMemberBySlug('jane-staff')).toBeUndefined()
  })
})

describe('getResources', () => {
  const resources = [
    entry('report', {
      title: 'Report',
      categories: ['financials-transparency'],
      published_on: '2026-02-03',
      authors: [{ name: 'Ana', role: 'CFO' }],
      image: { provider: 'local', id: 'i1', alt: 'Cover', meta: { storageKey: 'cover.png' } },
      file: { provider: 'local', id: 'f1', meta: { storageKey: 'report.pdf' } },
      body: [{ _type: 'block', children: [] }],
      seo_title: 'Report | VVF',
    }),
    entry('story', { title: 'Story', categories: ['stories'] }),
  ]

  it('maps resource fields, media URLs and SEO', async () => {
    getEmDashCollection.mockResolvedValue({ entries: resources })
    const [report] = await getResources()
    expect(getEmDashCollection).toHaveBeenCalledWith('resources', expect.objectContaining({ orderBy: { published_on: 'desc' } }))
    expect(report).toMatchObject({
      slug: 'report',
      categories: ['financials-transparency'],
      authors: [{ name: 'Ana', role: 'CFO' }],
      imageUrl: '/_emdash/api/media/file/cover.png',
      imageAlt: 'Cover',
      fileUrl: '/_emdash/api/media/file/report.pdf',
      body: [{ _type: 'block', children: [] }],
      seo: { title: 'Report | VVF' },
    })
  })

  it('filters by category and finds by slug', async () => {
    getEmDashCollection.mockResolvedValue({ entries: resources })
    expect((await getResourcesByCategory('stories')).map((r) => r.slug)).toEqual(['story'])
    expect(await getResource('story')).toMatchObject({ title: 'Story' })
    expect(await getResource('missing')).toBeUndefined()
  })
})

describe('getChildren', () => {
  it('maps the about text and orders by display order', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('test-c', { display_name: 'Test C.', age: 9, about: 'Lives with family.', published: true, order: 2 })],
    })
    const [child] = await getChildren()
    expect(getEmDashCollection).toHaveBeenCalledWith('children', expect.objectContaining({ orderBy: { order: 'asc' } }))
    expect(child).toMatchObject({ about: 'Lives with family.', order: 2 })
  })
})

describe('getPosts / getFeaturedPosts', () => {
  it('maps post fields and filters featured posts', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [
        entry('a', { title: 'A', published_on: '2026-01-01', category: 'News', featured: true }),
        entry('b', { title: 'B', published_on: '2026-01-02', category: 'News', featured: false }),
      ],
    })

    const featured = await getFeaturedPosts()

    expect(featured).toHaveLength(1)
    expect(featured[0]).toMatchObject({ slug: 'a', publishedAt: '2026-01-01' })
  })

  it('passes a category filter through to the query', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    await getPosts('Stories')
    expect(getEmDashCollection).toHaveBeenCalledWith('posts', expect.objectContaining({ where: { category: 'Stories' } }))
  })
})

describe('getSponsors / getSponsorshipPackages', () => {
  it('maps sponsor fields', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('s1', { name: 'Acme', logo: { src: '/acme.png' }, website: 'https://acme.example' })],
    })
    expect(await getSponsors()).toEqual([{ name: 'Acme', logoUrl: '/acme.png', website: 'https://acme.example' }])
  })

  it('lists partners only, in display order', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    await getPartners()
    expect(getEmDashCollection).toHaveBeenCalledWith(
      'sponsors',
      expect.objectContaining({ where: { partner: true }, orderBy: { order: 'asc' } })
    )
  })

  it('resolves local media (no src) to the EmDash media file URL', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('s1', { name: 'Acme', logo: { provider: 'local', id: 'm1', meta: { storageKey: 'abc.png' } } })],
    })
    expect((await getSponsors())[0].logoUrl).toBe('/_emdash/api/media/file/abc.png')
  })

  it('only requests general-scope sponsorship packages, never event-scoped ones', async () => {
    getEmDashCollection.mockResolvedValue({ entries: [] })
    await getSponsorshipPackages()
    expect(getEmDashCollection).toHaveBeenCalledWith(
      'sponsorship_packages',
      expect.objectContaining({ where: { scope: 'general' } })
    )
  })
})

describe('getFaqs', () => {
  it('maps faq fields and passes an optional category filter', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('f1', { question: 'Q?', answer: 'A.', category: 'donation', order: 1 })],
    })
    expect(await getFaqs('donation')).toEqual([{ question: 'Q?', answer: 'A.', category: 'donation', order: 1 }])
    expect(getEmDashCollection).toHaveBeenCalledWith('faqs', expect.objectContaining({ where: { category: 'donation' } }))
  })
})

describe('getCampaignUpdates / getCampaignSettings', () => {
  it('maps campaign update fields', async () => {
    getEmDashCollection.mockResolvedValue({
      entries: [entry('u1', { title: 'Update', date: '2026-01-01', video_url: 'https://vid' })],
    })
    expect(await getCampaignUpdates()).toEqual([
      { title: 'Update', date: '2026-01-01', imageUrl: undefined, videoUrl: 'https://vid', body: undefined },
    ])
  })

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

  it('returns an empty menu when none is configured', async () => {
    getMenu.mockResolvedValue(null)
    expect(await getPrimaryMenu()).toEqual([])
  })
})
