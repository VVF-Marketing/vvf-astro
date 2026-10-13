import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain ESM module shared with astro.config.mjs and scripts/
import { projectPathFor } from './legacyRoutes.mjs'

describe('projectPathFor', () => {
  it('maps static and dynamic live paths to project routes', () => {
    expect(projectPathFor('/all-events')).toBe('/events')
    expect(projectPathFor('/venezuela-earthquake-relief')).toBe('/earthquake-relief')
    expect(projectPathFor('/team-members/randy-lander')).toBe('/our-team/randy-lander')
    expect(projectPathFor('/children/test-c')).toBe('/sponsor-a-child/children/test-c')
    expect(projectPathFor('/resources-categories/all')).toBe('/resources')
    expect(projectPathFor('/resources-categories/stories')).toBe('/resources/category/stories')
    expect(projectPathFor('/team-members/join-our-board')).toBe('/contact')
  })

  it('leaves unchanged paths alone', () => {
    expect(projectPathFor('/')).toBe('/')
    expect(projectPathFor('/events/2026-golf-tournament')).toBe('/events/2026-golf-tournament')
    expect(projectPathFor('/resources/impact-report-2025')).toBe('/resources/impact-report-2025')
    expect(projectPathFor('/contact/')).toBe('/contact')
  })
})
