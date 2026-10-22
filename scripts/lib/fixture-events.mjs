// Made-up upcoming events for CI (`SEED_FIXTURE_EVENTS=1 npm run seed`).
//
// Each is a copy of the first upcoming event (English and Spanish) under a
// `fixture-` slug, dated far in the future so it sorts after real events:
// - `fixture-open-registration` keeps registration open, so the upcoming-event
//   checks keep working after the real event's date passes and its page turns
//   into a recap;
// - `fixture-closed-registration` has registration closed, for spec 7.8-2
//   (closed or sold-out registration hides every purchase link and shows a
//   note), which the live content has no event for.
// The open one is dated first, so it's the first upcoming event once the real
// ones are past. Like the fixture children, they're added only to the
// gitignored local seed and never by `db:setup` (the deployed path).

export const FIXTURE_EVENT_SLUG = 'fixture-closed-registration'
export const FIXTURE_OPEN_EVENT_SLUG = 'fixture-open-registration'

const FIXTURES = [
  { slug: FIXTURE_OPEN_EVENT_SLUG, start: '2099-11-08T00:00:00.000Z', registration: 'open', name: ['Fixture event (open registration)', 'Evento de prueba (inscripciones abiertas)'] },
  { slug: FIXTURE_EVENT_SLUG, start: '2099-11-09T00:00:00.000Z', registration: 'closed', name: ['Fixture event (closed registration)', 'Evento de prueba (inscripciones cerradas)'] },
]

// A seed with the fixture events added, or the seed unchanged when it already
// has them or has no upcoming event to copy.
export function withFixtureEvents(seed) {
  const events = seed.content?.events ?? []
  const missing = FIXTURES.filter((f) => !events.some((e) => e.slug === f.slug))
  const source = events.find((e) => !e.locale && e.data?.lifecycle === 'upcoming' && !e.slug.startsWith('fixture-'))
  if (!missing.length || !source) return seed
  const added = missing.flatMap((f) => {
    const id = `event-${f.slug}`
    const copy = (entry, extra, name) => ({
      ...entry,
      ...extra,
      slug: f.slug,
      data: { ...entry.data, name, start: f.start, registration: f.registration, featured: false },
    })
    const es = events
      .filter((e) => e.locale === 'es' && e.translationOf === source.id)
      .map((e) => copy(e, { id: `${id}--es`, translationOf: id }, f.name[1]))
    return [copy(source, { id }, f.name[0]), ...es]
  })
  return { ...seed, content: { ...seed.content, events: [...events, ...added] } }
}
