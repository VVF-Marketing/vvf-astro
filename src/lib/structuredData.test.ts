import { describe, expect, it } from 'vitest'
import { articleLd, breadcrumbList, eventLd, faqPage, ngo, orgId, person, serialize, webSite } from './structuredData'
import type { EventItem, ResourceItem } from './content/types'

const site = new URL('https://www.victoriavenezuelafoundation.org')
const ORG_ID = 'https://www.victoriavenezuelafoundation.org/#organization'

describe('ngo', () => {
  it('names the organization once, with contact, area served and a donate action', () => {
    const b = ngo(site, 'Nutrition, medical care and education.')
    expect(b['@id']).toBe(ORG_ID)
    expect(b).toMatchObject({
      '@type': 'NGO',
      nonprofitStatus: 'Nonprofit501c3',
      image: 'https://www.victoriavenezuelafoundation.org/images/og-default.jpg',
      contactPoint: { '@type': 'ContactPoint', email: 'info@victoriavenezuelafoundation.org' },
      areaServed: { '@type': 'Country', name: 'Venezuela' },
      potentialAction: { '@type': 'DonateAction', target: 'https://www.victoriavenezuelafoundation.org/ways-to-give', recipient: { '@id': ORG_ID } },
    })
  })

  it('points the donate action at the Spanish page on Spanish pages', () => {
    expect((ngo(site, 'x', 'es').potentialAction as { target: string }).target).toBe('https://www.victoriavenezuelafoundation.org/es/ways-to-give')
  })

  it("lists LinkedIn by the company page, not the footer's posts feed", () => {
    const sameAs = ngo(site, 'x').sameAs as string[]
    expect(sameAs).toContain('https://www.linkedin.com/company/victoriavenezuelafoundation/')
    expect(sameAs.some((u) => u.includes('feedView'))).toBe(false)
  })
})

describe('webSite', () => {
  it("is published by the organization, in the page's language", () => {
    expect(webSite(site, 'es')).toMatchObject({ '@type': 'WebSite', url: 'https://www.victoriavenezuelafoundation.org/es', inLanguage: 'es-VE', publisher: { '@id': ORG_ID } })
  })
})

describe('organization references', () => {
  it('carry the @id plus name and URL in events, articles and people', () => {
    const event = eventLd({ slug: 'golf', title: 'Golf', startDate: '2026-11-09', registration: 'open', lifecycle: 'upcoming' } as EventItem, site, 'https://x/events/golf')
    const article = articleLd({ slug: 'a', title: 'A', categories: [] } as unknown as ResourceItem, site, 'https://x/resources/a')
    const member = person({ name: 'Randy Lander', role: 'President' }, site, 'https://x/our-team/randy-lander')
    for (const ref of [event.organizer, article.publisher, member.worksFor]) {
      expect(ref).toEqual({ '@type': 'NGO', '@id': orgId(site), name: 'Victoria Venezuela Foundation', url: 'https://www.victoriavenezuelafoundation.org/' })
    }
  })
})

describe('faqPage', () => {
  it('lists each question with its answer, and nothing for no questions', () => {
    expect(faqPage([{ question: 'How much?', answer: '$25 a month.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'How much?', acceptedAnswer: { '@type': 'Answer', text: '$25 a month.' } }],
    })
    expect(faqPage([])).toBeUndefined()
  })
})

describe('breadcrumbList', () => {
  it("follows the visible trail, linking items in the page's language and ending at the current page", () => {
    const b = breadcrumbList([{ label: 'Recursos', href: '/resources' }, { label: 'Historias' }], site, 'es', 'https://www.victoriavenezuelafoundation.org/es/resources/stories')
    expect(b?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Recursos', item: 'https://www.victoriavenezuelafoundation.org/es/resources' },
      { '@type': 'ListItem', position: 2, name: 'Historias', item: 'https://www.victoriavenezuelafoundation.org/es/resources/stories' },
    ])
  })
})

describe('person', () => {
  it('gives the role as job title and an absolute photo URL', () => {
    expect(person({ name: 'Ana', role: 'Director', imageUrl: '/ana.webp', linkedin: 'https://www.linkedin.com/in/ana' }, site, 'https://x')).toMatchObject({
      '@type': 'Person',
      jobTitle: 'Director',
      image: 'https://www.victoriavenezuelafoundation.org/ana.webp',
      sameAs: ['https://www.linkedin.com/in/ana'],
    })
  })
})

describe('articleLd', () => {
  it("adds the description and the page's language", () => {
    const b = articleLd({ slug: 'a', title: 'A', categories: [], excerpt: 'Short.' } as unknown as ResourceItem, site, 'https://x', 'es')
    expect(b).toMatchObject({ description: 'Short.', inLanguage: 'es-VE' })
  })
})

describe('serialize', () => {
  it('escapes < so text cannot close the script tag', () => {
    expect(serialize({ name: '</script>' })).not.toContain('</script>')
  })
})
