// A made-up event with closed registration for CI (`SEED_FIXTURE_EVENTS=1
// npm run seed`).
//
// Spec 7.8-2 (closed or sold-out registration hides every purchase link and
// shows a note) can only be checked on an upcoming event whose registration
// isn't open, and the live content has none. This copies the first upcoming
// event (English and Spanish) under a `fixture-` slug, dated far in the future
// so it sorts after real events, with registration closed. Like the fixture
// children, it's added only to the gitignored local seed and never by
// `db:setup` (the deployed path).

export const FIXTURE_EVENT_SLUG = 'fixture-closed-registration'

// A seed with the fixture event added, or the seed unchanged when it already
// has it or has no upcoming event to copy.
export function withFixtureEvents(seed) {
  const events = seed.content?.events ?? []
  if (events.some((e) => e.slug === FIXTURE_EVENT_SLUG)) return seed
  const source = events.find((e) => !e.locale && e.data?.lifecycle === 'upcoming')
  if (!source) return seed
  const id = `event-${FIXTURE_EVENT_SLUG}`
  const copy = (entry, extra, name) => ({
    ...entry,
    ...extra,
    slug: FIXTURE_EVENT_SLUG,
    data: { ...entry.data, name, start: '2099-11-09T00:00:00.000Z', registration: 'closed', featured: false },
  })
  const en = copy(source, { id }, 'Fixture event (closed registration)')
  const es = events
    .filter((e) => e.locale === 'es' && e.translationOf === source.id)
    .map((e) => copy(e, { id: `${id}--es`, translationOf: id }, 'Evento de prueba (inscripciones cerradas)'))
  return { ...seed, content: { ...seed.content, events: [...events, en, ...es] } }
}
