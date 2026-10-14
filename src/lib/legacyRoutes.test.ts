import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain ESM module shared with astro.config.mjs and scripts/
import { TEMPORARY_REDIRECTS, projectPathFor, redirectStatus } from './legacyRoutes.mjs'

describe('projectPathFor', () => {
  it('maps static and dynamic live paths to project routes', () => {
    expect(projectPathFor('/all-events')).toBe('/events-and-campaigns')
    expect(projectPathFor('/team-members/randy-lander')).toBe('/our-team/randy-lander')
    expect(projectPathFor('/sponsor-a-child-list-page')).toBe('/children')
    expect(projectPathFor('/resources-categories/all')).toBe('/resources')
    expect(projectPathFor('/resources-categories/stories')).toBe('/resources/stories')
    expect(projectPathFor('/resources-categories/financials-transparency')).toBe('/resources/financials')
    expect(projectPathFor('/resources-categories/news')).toBe('/resources/news')
    expect(projectPathFor('/team-members/join-our-board')).toBe('/contact')
    expect(projectPathFor('/noticias')).toBe('/es/resources/news')
  })

  // Spec 2.5: paths outside systems depend on are pages, never redirects.
  it('never redirects the paths outside systems depend on', () => {
    for (const p of ['/venezuela-earthquake-relief', '/children/test-c', '/events/2026-golf-tournament', '/thank-you-donation']) {
      expect(projectPathFor(p)).toBe(p)
    }
  })

  it("maps this project's earlier paths to the spec's URL map", () => {
    expect(projectPathFor('/events')).toBe('/events-and-campaigns')
    expect(projectPathFor('/earthquake-relief')).toBe('/venezuela-earthquake-relief')
    expect(projectPathFor('/sponsor-a-child/children')).toBe('/children')
    expect(projectPathFor('/sponsor-a-child/children/test-c')).toBe('/children/test-c')
    expect(projectPathFor('/resources/category/financials-transparency')).toBe('/resources/financials')
  })

  it('leaves unchanged paths alone', () => {
    expect(projectPathFor('/')).toBe('/')
    expect(projectPathFor('/events/2026-golf-tournament')).toBe('/events/2026-golf-tournament')
    expect(projectPathFor('/resources/impact-report-2025')).toBe('/resources/impact-report-2025')
    expect(projectPathFor('/contact/')).toBe('/contact')
  })
})

describe('Spanish legacy paths', () => {
  it('map through the same table once the /es prefix is removed', () => {
    const spanish = (p: string) => '/es' + projectPathFor(p.replace(/^\/es/, ''))
    expect(spanish('/es/team-members/randy-lander')).toBe('/es/our-team/randy-lander')
    expect(spanish('/es/all-events')).toBe('/es/events-and-campaigns')
    expect(spanish('/es/resources-categories/stories')).toBe('/es/resources/stories')
  })
})

// Review finding (PRs #18/#19): the stand-in redirect for the financials page
// was a permanent 301, which browsers keep after the page is built.
describe('redirectStatus', () => {
  it('is temporary for stand-ins and permanent for moved pages', () => {
    TEMPORARY_REDIRECTS.add('/stand-in')
    try {
      expect(redirectStatus('/stand-in')).toBe(302)
      expect(redirectStatus('/stand-in/')).toBe(302)
      expect(redirectStatus('/all-events')).toBe(301)
    } finally {
      TEMPORARY_REDIRECTS.delete('/stand-in')
    }
  })

  it('no longer redirects the financials page, which exists now', () => {
    expect(projectPathFor('/financials-and-transparency')).toBe('/financials-and-transparency')
  })
})

