// Made-up child profiles for CI (`SEED_FIXTURE_CHILDREN=1 npm run seed`).
//
// Real child data never enters the repo (it's public): children live only in
// the gitignored seed/seed.local.json, built from the local Webflow snapshot.
// Without them every child page check skips, so CI would never open the child
// list or a profile. These fixtures fill that gap: clearly fictional names
// (the NATO alphabet), no birth places or stories about real people, and a
// public program photo already in the seed. They're added only to the local
// seed, only when it has no children, and never by `db:setup` (Postgres,
// the deployed path).

const PEOPLE = [
  { name: 'Alfa T.', age: 4, gender: 'female', birth_date: '2022-03-14', status: 'available', dream: ['Teacher', 'Maestra'] },
  { name: 'Bravo T.', age: 7, gender: 'male', status: 'available', dream: ['Doctor', 'Médico'] },
  { name: 'Charlie T.', age: 9, gender: 'female', birth_date: '2017-06-02', status: 'available', dream: ['Engineer', 'Ingeniera'] },
  { name: 'Delta T.', age: 12, gender: 'male', status: 'available', dream: ['Pilot', 'Piloto'] },
  { name: 'Echo T.', age: 16, gender: 'female', status: 'available', dream: ['Nurse', 'Enfermera'] },
  { name: 'Foxtrot T.', age: 8, gender: 'male', status: 'sponsored', dream: ['Chef', 'Chef'] },
]

const block = (key, text) => [{ _type: 'block', _key: key, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }] }]

// The fixture entries (English, then each Spanish translation), in the seed's
// content-model shape. `photo` is a public media value from the seed.
export function fixtureChildren(photo) {
  const en = []
  const es = []
  for (const p of PEOPLE) {
    const slug = `fixture-${p.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`
    const id = `child-${slug}`
    const shared = {
      name: p.name,
      age: p.age,
      ...(p.birth_date ? { birth_date: p.birth_date } : {}),
      gender: p.gender,
      photo: { ...photo, alt: p.name },
      sponsorship_status: p.status,
      featured: false,
    }
    en.push({ id, slug, status: 'published', data: { ...shared, summary: 'A made-up profile for automated tests.', story: block(`${id}-s0`, 'A made-up profile for automated tests. Not a real child.'), dream: p.dream[0] } })
    es.push({ id: `${id}--es`, slug, status: 'published', locale: 'es', translationOf: id, data: { ...shared, summary: 'Un perfil inventado para pruebas automáticas.', story: block(`${id}--es-s0`, 'Un perfil inventado para pruebas automáticas. No es un niño real.'), dream: p.dream[1] } })
  }
  return [...en, ...es]
}

// A seed with the fixtures added, or the seed unchanged when it already has
// children (real data always wins). The photo is the first public image the
// seed's events use.
export function withFixtureChildren(seed) {
  if ((seed.content?.children ?? []).length > 0) return seed
  const photo = (seed.content?.events ?? []).map((e) => e.data?.hero_photo).find((v) => v?.id)
  if (!photo) throw new Error('fixture children need an event hero photo in the seed')
  return { ...seed, content: { ...seed.content, children: fixtureChildren(photo) } }
}
