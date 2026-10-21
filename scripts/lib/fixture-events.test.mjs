import { describe, expect, it } from 'vitest'
import { FIXTURE_EVENT_SLUG, withFixtureEvents } from './fixture-events.mjs'

const upcoming = { id: 'event-golf', slug: 'golf', status: 'published', data: { name: 'Golf', lifecycle: 'upcoming', registration: 'open', featured: true, start: '2026-11-09' } }
const spanish = { id: 'event-golf--es', slug: 'golf', status: 'published', locale: 'es', translationOf: 'event-golf', data: { ...upcoming.data, name: 'Golf ES' } }
const past = { id: 'event-old', slug: 'old', status: 'published', data: { name: 'Old', lifecycle: 'past', registration: 'closed' } }

describe('withFixtureEvents', () => {
  it('adds a closed-registration copy of the first upcoming event, in both languages', () => {
    const seed = withFixtureEvents({ content: { events: [past, upcoming, spanish] } })
    const added = seed.content.events.filter((e) => e.slug === FIXTURE_EVENT_SLUG)
    expect(added.map((e) => [e.id, e.locale, e.translationOf])).toEqual([
      ['event-fixture-closed-registration', undefined, undefined],
      ['event-fixture-closed-registration--es', 'es', 'event-fixture-closed-registration'],
    ])
    for (const e of added) expect(e.data).toMatchObject({ lifecycle: 'upcoming', registration: 'closed', featured: false, start: '2099-11-09T00:00:00.000Z' })
    // The real event is untouched.
    expect(seed.content.events.find((e) => e.id === 'event-golf').data.registration).toBe('open')
  })

  it('leaves the seed alone when the fixture exists or nothing is upcoming', () => {
    const once = withFixtureEvents({ content: { events: [upcoming] } })
    expect(withFixtureEvents(once)).toBe(once)
    const none = { content: { events: [past] } }
    expect(withFixtureEvents(none)).toBe(none)
  })
})
