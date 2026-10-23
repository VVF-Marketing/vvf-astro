// Helpers for the spec conformance suite: one test per check per language,
// titled with the check id, tagged from the registry (D3, D15).
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { withFixtureChildren } from '../../scripts/lib/fixture-children.mjs'
import { check } from './registry'

export type Lang = 'en' | 'es'
export const LANGS: Lang[] = ['en', 'es']

// '/contact' -> '/es/contact', '/' -> '/es'.
export function inLang(path: string, lang: Lang): string {
  if (lang === 'en') return path
  return path === '/' ? '/es' : `/es${path}`
}

function tags(id: string, extra: string[] = []): string {
  const c = check(id)
  return [...(c.conformant ? ['@conformant'] : []), ...extra].join(' ')
}

interface Options {
  // '@layout' puts the test in the slow viewport-sweep project.
  tags?: string[]
}

// `[7.14-1] en /contact` and `[7.14-1] es /es/contact`: a check passes only
// when every one of its tests passes, in both languages.
export function bilingual(
  id: string,
  enPath: string,
  fn: (args: { page: Page; path: string; lang: Lang }) => Promise<void>,
  options: Options = {}
) {
  for (const lang of LANGS) {
    const path = inLang(enPath, lang)
    test(`[${id}] ${lang} ${path} ${tags(id, options.tags)}`.trim(), async ({ page }) => {
      await fn({ page, path, lang })
    })
  }
}

// Checks that don't depend on the language: `[5.9-2] <subject>`.
export function single(id: string, subject: string, fn: (args: { page: Page }) => Promise<void>, options: Options = {}) {
  test(`[${id}] ${subject} ${tags(id, options.tags)}`.trim(), async ({ page }) => {
    await fn({ page })
  })
}

// Target paths from the spec's URL map (2.2), English form.
export const SPEC_PAGES = [
  '/',
  '/sponsor-a-child',
  '/children',
  '/ways-to-give',
  '/corporate-sponsorships',
  '/events-and-campaigns',
  '/venezuela-earthquake-relief',
  '/our-programs',
  '/our-team',
  '/financials-and-transparency',
  '/resources',
  '/resources/stories',
  '/resources/financials',
  '/contact',
  '/privacy-policy',
  '/thank-you-sponsorship',
  '/thank-you-donation',
  '/thank-you-earthquake-relief',
] as const

export const THANK_YOU_PAGES = ['/thank-you-sponsorship', '/thank-you-donation', '/thank-you-earthquake-relief'] as const

// Seed fixtures. Children exist only in the gitignored seed.local.json, or as
// stand-in children where SEED_FIXTURE_CHILDREN=1 seeded them (the container
// job, which reads the committed seed), so child checks report blocked
// (skipped with a reason) where there are none.
const localSeedPath = fileURLToPath(new URL('../../seed/seed.local.json', import.meta.url))
const seedPath = existsSync(localSeedPath) ? localSeedPath : fileURLToPath(new URL('../../seed/seed.json', import.meta.url))
const seedFile = JSON.parse(readFileSync(seedPath, 'utf-8'))
export const seed = (process.env.SEED_FIXTURE_CHILDREN === '1' ? withFixtureChildren(seedFile) : seedFile) as {
  content: Record<string, { slug?: string; id?: string; locale?: string; data: Record<string, unknown> }[]>
}
export const HAS_CHILD_DATA = (seed.content.children ?? []).length > 0
export const NO_CHILD_DATA = 'blocked: child data not available in this environment (no children in the seed)'

export function seedItems(collection: string) {
  return seed.content[collection] ?? []
}

// Same-origin pathnames of every link on the page.
export async function internalLinks(page: Page): Promise<string[]> {
  return page.$$eval('a[href]', (as) =>
    as
      .map((a) => new URL((a as HTMLAnchorElement).href, location.href))
      .filter((u) => u.origin === location.origin)
      .map((u) => u.pathname)
  )
}

// English entries of a target collection (Appendix B name), or of the
// collection the build uses today when the target doesn't exist yet, so
// expected values can be computed before and after the content migration.
export function english(target: string, legacy?: string) {
  const pick = seed.content[target] ? target : legacy
  return (pick ? (seed.content[pick] ?? []) : []).filter((e) => !e.locale)
}

// The <section> whose heading matches, for section-level checks.
export function sectionByHeading(page: Page, heading: RegExp) {
  return page.locator('main section').filter({ has: page.getByRole('heading', { name: heading }) }).last()
}

export async function hrefsIn(page: Page, selector = 'main') {
  return page.$$eval(`${selector} a[href]`, (as) =>
    as.map((a) => {
      const u = new URL((a as HTMLAnchorElement).href, location.href)
      return u.origin === location.origin ? u.pathname + u.search + u.hash : u.href
    })
  )
}

// Opens a spec path: it must answer 200 itself, not through a redirect
// (redirects are checked by 2.8-5 and 2.8-7).
export async function open(page: Page, path: string) {
  // Don't wait for third-party iframes (Donorbox) to finish loading.
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
  const redirected = res?.request().redirectedFrom()
  expect(redirected ? `redirects to ${new URL(res!.url()).pathname}` : res?.status(), `${path} must exist`).toBe(200)
}

// The page's schema.org blocks, parsed (a block that isn't JSON fails here).
export async function jsonLdBlocks(page: Page): Promise<Record<string, any>[]> {
  const raw = await page.$$eval('script[type="application/ld+json"]', (ss) => ss.map((s) => s.textContent ?? ''))
  return raw.map((r) => JSON.parse(r))
}
