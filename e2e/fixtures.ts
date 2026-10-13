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
  const child = collection('children').find((c) => c.data.published)
  return child ? { slug: child.slug, displayName: child.data.display_name as string, age: child.data.age as number } : undefined
}

export function firstEvent() {
  const [event] = collection('events')
  if (!event) throw new Error('seed/seed.json has no event fixture')
  return { slug: event.slug, title: event.data.title as string }
}

export function firstPost() {
  const [post] = collection('posts')
  if (!post) throw new Error('seed/seed.json has no post fixture')
  return { slug: post.slug, title: post.data.title as string }
}

export function firstBoardMember() {
  const member = collection('team_members').find((m) => m.data.tier === 'board' && m.data.profile_slug)
  if (!member) throw new Error('seed has no board-tier team member with a profile')
  return { slug: member.data.profile_slug as string, name: member.data.name as string }
}

export function firstStaffMember() {
  const member = collection('team_members').find((m) => m.data.tier === 'staff')
  if (!member) throw new Error('seed has no staff-tier team member fixture')
  return { slug: member.slug, name: member.data.name as string, profileSlug: member.data.profile_slug as string | undefined }
}

export function firstResource() {
  const [resource] = collection('resources')
  if (!resource) throw new Error('seed has no resource fixture')
  return { slug: resource.slug, title: resource.data.title as string, categories: (resource.data.categories as string[]) ?? [] }
}
