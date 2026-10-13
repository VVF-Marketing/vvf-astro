import { expect, test } from '@playwright/test'

// The admin sidebar's organization as EmDash serves it
// (openspec/changes/organize-cms-admin-navigation). Reading the schema needs
// a token with schema:read for the database under test (EMDASH_ADMIN_TOKEN);
// CI seeds a fresh database with no tokens, so this only runs locally.
const TOKEN = process.env.EMDASH_ADMIN_TOKEN
test.skip(!TOKEN, 'no EmDash admin token available')

interface Collection {
  slug: string
  label: string
  group?: string
  sortOrder?: number
  hidden?: boolean
  titleField?: string
}

test('the sidebar has Pages & SEO, CMS collections and Banner, in that order', async ({ request }) => {
  const res = await request.get('/_emdash/api/schema/collections', { headers: { Authorization: `Bearer ${TOKEN}` } })
  expect(res.ok(), await res.text()).toBe(true)
  const collections = ((await res.json()).data.items as Collection[]).sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9))
  const visible = collections.filter((c) => !c.hidden)

  const folders = [...new Set(visible.map((c) => c.group))]
  expect(folders).toEqual(['Pages & SEO', 'CMS collections', 'Banner'])

  const pages = visible.filter((c) => c.group === 'Pages & SEO')
  expect(pages[0]).toMatchObject({ slug: 'copy_home', label: 'Home', titleField: 'title' })
  expect(pages.at(-1)).toMatchObject({ slug: 'copy_site', label: 'Site-wide text' })
  expect(pages.map((c) => c.label)).toContain('Event pages (shared text)')

  expect(visible.filter((c) => c.group === 'CMS collections').map((c) => c.label)).toEqual([
    'Events',
    'Blog posts',
    'Resources',
    'FAQs',
    'Testimonials',
    'Team members',
    'Sponsors / partners',
    'Sponsorship packages',
    'Silent auction items',
    'Earthquake relief updates',
    'Children',
  ])
  expect(visible.filter((c) => c.group === 'Banner').map((c) => c.label)).toEqual(['Site banner'])
  expect(collections.find((c) => c.slug === 'pages')?.hidden).toBe(true)
})

test("a page's slots sorted by title list SEO first, then the page from the top", async ({ request }) => {
  const res = await request.get('/_emdash/api/content/copy_home?locale=en&limit=100&orderBy=title&order=asc', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  expect(res.ok(), await res.text()).toBe(true)
  const titles = ((await res.json()).data.items as { data: { title: string } }[]).map((i) => i.data.title)
  expect(titles.slice(0, 3)).toEqual(['01 · SEO · SEO title (browser tab and search results)', expect.stringMatching(/^02 · SEO · /), expect.stringMatching(/^03 · SEO · /)])
  expect(titles[3]).toMatch(/^04 · Content · /)
})
