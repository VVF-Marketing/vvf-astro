import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { withFixtureChildren } from '../scripts/lib/fixture-children.mjs'

// Reuses the seed `npm run seed` applied as the single source of truth for
// E2E fixtures: seed/seed.local.json (gitignored; includes children) when it
// exists, otherwise the committed seed/seed.json (no children — public repo).
const localSeedPath = fileURLToPath(new URL('../seed/seed.local.json', import.meta.url))
const seedPath = existsSync(localSeedPath) ? localSeedPath : fileURLToPath(new URL('../seed/seed.json', import.meta.url))
// Stand-in children too where SEED_FIXTURE_CHILDREN=1 seeded them.
const seedFile = JSON.parse(readFileSync(seedPath, 'utf-8'))
const seed = process.env.SEED_FIXTURE_CHILDREN === '1' ? withFixtureChildren(seedFile) : seedFile

interface SeedEntry {
  slug: string
  data: Record<string, unknown>
}

function collection(name: string): SeedEntry[] {
  return seed.content[name] ?? []
}

// Undefined when the seed has no children (no real or stand-in children).
export function firstChild() {
  const child = collection('children').find((c) => c.data.sponsorship_status === 'available')
  return child ? { slug: child.slug, displayName: child.data.name as string, age: child.data.age as number } : undefined
}

// The file an event's card photo is served from, when it has one.
export function eventCardPhotoFile(slug: string) {
  const event = collection('events').find((e) => e.slug === slug)
  return (event?.data.card_photo as { meta?: { storageKey?: string } } | undefined)?.meta?.storageKey
}

export function firstEvent() {
  const [event] = collection('events')
  if (!event) throw new Error('seed/seed.json has no event fixture')
  return { slug: event.slug, title: event.data.name as string }
}

// One record per person (src/lib/contentModel.mjs), in one or more groups.
const inGroup = (group: string) => (m: SeedEntry) => ((m.data.groups as string[] | undefined) ?? []).includes(group) && !m.data.open_seat

export function firstBoardMember() {
  const member = collection('team_members').find(inGroup('board'))
  if (!member) throw new Error('seed has no board member with a profile')
  return { slug: member.slug, name: member.data.name as string }
}

export function firstStaffMember() {
  const member = collection('team_members').find(inGroup('staff'))
  if (!member) throw new Error('seed has no staff member fixture')
  return { slug: member.slug, name: member.data.name as string }
}

// Category refs are seed `$ref:category-<slug>` values.
export function firstResource() {
  const [article] = collection('articles').filter((a) => !(a as { locale?: string }).locale)
  if (!article) throw new Error('seed has no article fixture')
  const category = String(article.data.category ?? '').replace(/^\$ref:category-/, '')
  return { slug: article.slug, title: article.data.title as string, categories: category ? [category === 'financials' ? 'financials-transparency' : category] : [] }
}

// Made-up upcoming events (SEED_FIXTURE_EVENTS=1, scripts/lib/fixture-events.mjs),
// dated 2099 so upcoming-event checks don't break when a real event's date
// passes.
export const FIXTURE_OPEN_EVENT = '/events/fixture-open-registration'
export const FIXTURE_CLOSED_EVENT = '/events/fixture-closed-registration'

// Opens a fixture event page. When the run was seeded with the fixtures (CI),
// a missing one fails the test; otherwise the test is skipped.
export async function gotoFixtureEvent(page: Page, path: string) {
  const res = await page.goto(path)
  if (res?.status() !== 404) return
  expect(process.env.SEED_FIXTURE_EVENTS, `${path} is missing although SEED_FIXTURE_EVENTS=1`).not.toBe('1')
  test.skip(true, 'no fixture event (seed with SEED_FIXTURE_EVENTS=1)')
}
