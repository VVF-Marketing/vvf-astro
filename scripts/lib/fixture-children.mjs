// Stand-in children: made-up child profiles (GLOSSARY.md), added only with
// SEED_FIXTURE_CHILDREN=1, by `npm run seed` and by `npm run db:setup`.
//
// Real child data never enters the repo (it's public) and never leaves
// production (openspec/changes/add-vercel-deploy-pipeline, D1): children live
// only in the gitignored seed/seed.local.json, built from the local Webflow
// snapshot. Without them every child page check skips, so CI and previews
// would never open the child list or a profile. These fill that gap: clearly
// fictional names (the NATO alphabet), no birth places or stories about real
// people, and an illustrated placeholder photo, never a program photo (those
// can show real children). CI, the container job and the preview parent set
// the flag; production never does.
import { mediaIdFor, storageKeyFor } from './seed-media.mjs'

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
// content-model shape. `photo` is the placeholder's media value.
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

// The placeholder photo's media manifest, added to the public one wherever
// stand-in children are seeded, so its file is uploaded with the rest. It
// lives here rather than in seed/media/manifest.json, which the Webflow
// harvest rewrites.
const PHOTO_PATH = 'seed/media/fixtures/stand-in-child.png'
export const FIXTURE_MEDIA = {
  'fixture:stand-in-child': {
    path: PHOTO_PATH,
    contentType: 'image/png',
    bytes: 20420,
    sha256: '13c26cc22822db1fa321362be2d7f62d6754c9770e22d072f7bb1c77ba6f5fab',
    alt: 'An illustration standing in for a made-up profile.',
  },
}

// Its field value: what mediaValueFor() gives for the entry, without reading
// the file, so the e2e helpers can build the same entries.
export const FIXTURE_PHOTO = {
  provider: 'local',
  id: mediaIdFor(PHOTO_PATH),
  width: 800,
  height: 800,
  mimeType: 'image/png',
  filename: 'stand-in-child.png',
  meta: { storageKey: storageKeyFor(PHOTO_PATH) },
}

// A seed with the stand-ins added, or the seed unchanged when it already has
// children (real data always wins).
export function withFixtureChildren(seed) {
  if ((seed.content?.children ?? []).length > 0) return seed
  return { ...seed, content: { ...seed.content, children: fixtureChildren(FIXTURE_PHOTO) } }
}
