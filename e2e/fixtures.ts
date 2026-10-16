import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Reuses the seed `npm run seed` applied as the single source of truth for
// E2E fixtures: seed/seed.local.json (gitignored; includes children) when it
// exists, otherwise the committed seed/seed.json (no children — public repo).
const localSeedPath = fileURLToPath(new URL('../seed/seed.local.json', import.meta.url))
const seedPath = existsSync(localSeedPath) ? localSeedPath : fileURLToPath(new URL('../seed/seed.json', import.meta.url))
const seed = JSON.parse(readFileSync(seedPath, 'utf-8'))

interface SeedEntry {
  slug: string
  data: Record<string, unknown>
}

function collection(name: string): SeedEntry[] {
  return seed.content[name] ?? []
}

// Undefined when the seed has no children (CI, where child data isn't available).
export function firstChild() {
  const child = collection('children').find((c) => c.data.sponsorship_status === 'available')
  return child ? { slug: child.slug, displayName: child.data.name as string, age: child.data.age as number } : undefined
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
