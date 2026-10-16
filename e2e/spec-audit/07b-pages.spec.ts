// Spec pages 7.7 to 7.11: Events & Campaigns, Event Page, Our Team, Team Bio,
// Financials & Transparency.
import { expect, test, type Page } from '@playwright/test'
import { bilingual, open, english, hrefsIn, inLang, jsonLdBlocks, LANGS, single, type Lang } from './helpers'


const today = new Date().toISOString()
const startOf = (d: Record<string, any>) => String(d.start ?? d.start_date ?? '')
const events = () => english('events')
const upcoming = () => events().filter((e) => startOf(e.data) >= today && e.data.lifecycle !== 'cancelled').sort((a, b) => startOf(a.data).localeCompare(startOf(b.data)))
const past = () => events().filter((e) => startOf(e.data) < today).sort((a, b) => startOf(b.data).localeCompare(startOf(a.data)))
const eventLinks = async (page: Page, selector: string) => [...new Set((await hrefsIn(page, selector)).filter((h) => /\/events\/[^/]+$/.test(h)))]

// --- 7.7 Events & Campaigns ----------------------------------------------------

bilingual('7.7-1', '/events-and-campaigns', async ({ page, path, lang }) => {
  await open(page, path)
  expect(await eventLinks(page, '#upcoming-events'), 'Upcoming').toEqual(upcoming().slice(0, 4).map((e) => inLang(`/events/${e.slug}`, lang)))
  expect(await eventLinks(page, '#past-events'), 'Archive').toEqual(past().slice(0, 6).map((e) => inLang(`/events/${e.slug}`, lang)))
})

bilingual('7.7-2', '/events-and-campaigns', async ({ page, path }) => {
  await open(page, path)
  const n = upcoming().length
  const cards = page.locator('#upcoming-events a[href*="/events/"]')
  expect(await cards.count(), 'up to four cards').toBe(Math.min(n, 4))
  // "See all 5" / "Ver los 5" (not the cards' "Ver los detalles").
  const seeAll = page.locator('#upcoming-events').getByRole('button', { name: /see all \d|ver (los|las|todos|todas) \d/i })
  await expect(seeAll).toHaveCount(n > 4 ? 1 : 0)
  if (n % 2 === 1) {
    const widths = await cards.evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().width))
    const container = await page.locator('#upcoming-events').evaluate((s) => s.getBoundingClientRect().width)
    expect(widths[0], 'odd count: first card is wide').toBeGreaterThan(container * 0.6)
  }
})

bilingual('7.7-3', '/events-and-campaigns', async ({ page, path }) => {
  // Campaign cards are page content; without an active campaign there's no band.
  await open(page, path)
  const active = await page.locator('#campaigns a').count()
  if (active === 0) await expect(page.locator('#campaigns')).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 800 })
  await open(page, path)
  const selected = page.getByRole('tab', { selected: true })
  await expect(selected).toHaveText(active ? /campa/i : /event/i)
})

bilingual('7.7-4', '/events-and-campaigns', async ({ page, path }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await open(page, `${path}#past-events`)
  await expect(page.getByRole('tab', { selected: true })).toHaveText(/event/i)
  await expect(page.locator('#past-events')).toBeInViewport()
})

bilingual('7.7-5', '/events-and-campaigns', async ({ page, path, lang }) => {
  test.skip(past().length <= 6, `needs 7+ past events in the seed (has ${past().length})`)
  await open(page, path)
  await expect(page.locator('#past-events')).toContainText(lang === 'es' ? /Página 1 de \d/ : /Page 1 of \d/)
})

// --- 7.8 Event Page -------------------------------------------------------------

for (const lang of LANGS as Lang[]) {
  single('7.8-1', `${lang} lifecycle`, async ({ page }) => {
    for (const e of events()) {
      expect(e.data.lifecycle, `${e.slug} has a lifecycle`).toMatch(/^(upcoming|past|cancelled)$/)
      await open(page, inLang(`/events/${e.slug}`, lang))
      const tickets = await page.getByRole('heading', { name: lang === 'es' ? /entradas|boletos/i : /tickets/i }).count()
      if (e.data.lifecycle === 'upcoming') expect(tickets, `${e.slug}: selling page`).toBeGreaterThan(0)
      else expect(tickets, `${e.slug}: no selling page`).toBe(0)
    }
  })

  single('7.8-2', `${lang} registration closed`, async ({ page }) => {
    const closed = events().filter((e) => ['sold_out', 'closed'].includes(String(e.data.registration)))
    test.skip(closed.length === 0, 'no event with registration sold_out or closed in the seed')
    for (const e of closed) {
      await open(page, inLang(`/events/${e.slug}`, lang))
      const ticketLinks = (await hrefsIn(page)).filter((h) => h.includes('donorbox.org/events'))
      expect(ticketLinks, `${e.slug}: no ticket buttons`).toEqual([])
    }
  })

  single('7.8-3', `${lang} sold-out offers`, async ({ page }) => {
    const live = upcoming()[0]
    test.skip(!live, 'no upcoming event')
    await open(page, inLang(`/events/${live.slug}`, lang))
    const badge = lang === 'es' ? /AGOTADO/ : /SOLD OUT|\(SOLD\)/
    // Sold-out special opportunities, by their offer flag (target `sold_out`, today's packages too).
    const soldSpecial = english('event_offers', 'sponsorship_packages').filter((o) => o.data.sold_out && /special/.test(String(o.data.kind)))
    const soldTabs = page.getByRole('tab').filter({ hasText: lang === 'es' ? /\(AGOTADO\)/ : /\(SOLD\)/ })
    expect(await soldTabs.count(), `sold-out tabs read ${lang === 'es' ? '(AGOTADO)' : '(SOLD)'}`).toBe(soldSpecial.length)
    for (const t of await soldTabs.all()) expect((await t.isDisabled()) || (await t.getAttribute('aria-disabled')) === 'true', 'sold-out tab locked').toBe(true)
    const soldCards = page.locator('main article, main li, main [class*="card"]').filter({ hasText: badge })
    for (const c of await soldCards.all()) await expect(c.locator('a[href*="donorbox"]')).toHaveCount(0)
  })

  // Structure only: the online validator isn't reachable from the test run.
  single('7.8-5', `${lang} Event structured data`, async ({ page }) => {
    for (const e of events()) {
      await open(page, inLang(`/events/${e.slug}`, lang))
      const blocks = (await jsonLdBlocks(page)).filter((b) => b['@type'] === 'Event')
      expect(blocks, `${e.slug}: one Event block`).toHaveLength(1)
      const b = blocks[0]
      for (const k of ['name', 'startDate', 'image', 'eventStatus']) expect(b[k], `${e.slug}: ${k}`).toBeTruthy()
      expect(b.location?.['@type'], `${e.slug}: location`).toBe('Place')
      expect(b.location?.address?.addressCountry).toBe('US')
      expect(b.organizer?.name).toBe('Victoria Venezuela Foundation')
      expect(b.eventStatus).toBe(`https://schema.org/${e.data.lifecycle === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`)
      const open_ = e.data.registration === 'open' && e.data.lifecycle !== 'cancelled'
      if (open_) {
        expect(b.offers?.url, `${e.slug}: offers while registration is open`).toBe(e.data.registration_url)
        if (e.data.tickets_from != null) expect(Number(b.offers.price)).toBe(Number(e.data.tickets_from))
      } else expect(b.offers, `${e.slug}: no offers once registration closes`).toBeUndefined()
    }
  })

  single('7.8-4', `${lang} empty recap sections`, async ({ page }) => {
    const recaps = events().filter((e) => e.data.lifecycle === 'past' || startOf(e.data) < today)
    for (const e of recaps) {
      await open(page, inLang(`/events/${e.slug}`, lang))
      if (!e.data.recap_video) await expect(page.locator('main iframe[src*="youtube"], main iframe[src*="vimeo"]'), `${e.slug}: video`).toHaveCount(0)
      if (!(e.data.testimonials as unknown[] | undefined)?.length) await expect(page.locator('main blockquote'), `${e.slug}: testimonials`).toHaveCount(0)
      if (!e.data.next_edition) {
        await expect(page.getByRole('heading', { name: lang === 'es' ? /anótalo en tu calendario|marca tu calendario|agenda/i : /mark your calendar/i }), `${e.slug}: next edition`).toHaveCount(0)
      }
    }
  })
}

// --- 7.9 Our Team -------------------------------------------------------------------

// Each person's groups: `groups` (target) or one record per tier sharing a profile (today).
function people() {
  const byPerson = new Map<string, { slug: string; groups: Set<string>; order: number; openSeat: boolean; linkedin?: string; background: number }>()
  for (const m of english('team_members')) {
    const d = m.data
    const slug = String(d.profile_slug ?? m.slug)
    const p = byPerson.get(slug) ?? { slug, groups: new Set<string>(), order: Number(d.display_order ?? d.order ?? 0), openSeat: Boolean(d.open_seat), background: 0 }
    for (const g of (d.groups as string[] | undefined) ?? [d.tier === 'leader' ? 'leadership' : d.tier]) p.groups.add(String(g))
    p.linkedin ??= (d.linkedin as string | undefined) ?? (d.social_links as { platform: string; url: string }[] | undefined)?.find((s) => s.platform === 'linkedin')?.url
    p.background = Math.max(p.background, ((d.background as unknown[]) ?? []).length)
    byPerson.set(slug, p)
  }
  return [...byPerson.values()]
}

async function sectionBios(page: Page, heading: RegExp) {
  const section = page.locator('main section').filter({ has: page.getByRole('heading', { level: 2, name: heading }) }).first()
  return [...new Set((await hrefsIn(page, `main section:has(h2:text-matches("${heading.source}", "i"))`)).filter((h) => /\/our-team\/[^/]+$/.test(h)))]
}

const BOARD = /board of directors|junta directiva/
const STAFF = /^(our team|nuestro equipo)$/

bilingual('7.9-1', '/our-team', async ({ page, path, lang }) => {
  await open(page, path)
  const board = await sectionBios(page, BOARD)
  const staff = await sectionBios(page, STAFF)
  const want = (g: string) => people().filter((p) => p.groups.has(g) && !p.openSeat).sort((a, b) => a.order - b.order).map((p) => inLang(`/our-team/${p.slug}`, lang))
  expect(board, 'Board section').toEqual(want('board'))
  expect(staff, 'Our Team section').toEqual(want('staff'))
})

bilingual('7.9-2', '/our-team', async ({ page, path, lang }) => {
  await open(page, path)
  const contact = `${inLang('/contact', lang)}?topic=Other`
  const all = await hrefsIn(page)
  expect(all.filter((h) => h === contact).length, 'one open-seat tile to Contact, topic Other').toBe(1)
  const staffSection = await hrefsIn(page, `main section:has(h2:text-matches("${STAFF.source}", "i"))`)
  expect(staffSection.filter((h) => h.startsWith(inLang('/contact', lang))), 'no open seat under Our Team').toEqual([])
})

bilingual('7.9-3', '/our-team', async ({ page, path, lang }) => {
  await open(page, path)
  const board = await sectionBios(page, BOARD)
  const ordered = people().filter((p) => p.groups.has('board') && !p.openSeat).sort((a, b) => a.order - b.order).map((p) => inLang(`/our-team/${p.slug}`, lang))
  expect(board).toEqual(ordered)
})

// --- 7.10 Team Bio ---------------------------------------------------------------------

for (const lang of LANGS as Lang[]) {
  single('7.10-1', `${lang} LinkedIn icon`, async ({ page }) => {
    const withLink = people().find((p) => p.linkedin && !p.openSeat)
    const without = people().find((p) => !p.linkedin && !p.openSeat)
    if (without) {
      await open(page, inLang(`/our-team/${without.slug}`, lang))
      await expect(page.locator('main a[href*="linkedin.com"]'), `${without.slug}: no LinkedIn icon`).toHaveCount(0)
    }
    if (withLink) {
      await open(page, inLang(`/our-team/${withLink.slug}`, lang))
      await expect(page.locator('main a[href*="linkedin.com"]').first()).toHaveAttribute('target', '_blank')
    }
  })

  single('7.10-2', `${lang} no Background box`, async ({ page }) => {
    const none = people().find((p) => p.background === 0 && !p.openSeat)
    test.skip(!none, 'everyone has background items')
    await open(page, inLang(`/our-team/${none!.slug}`, lang))
    await expect(page.locator('main').getByText(lang === 'es' ? /^(trayectoria|antecedentes)$/i : /^background$/i)).toHaveCount(0)
  })
}

const someBio = () => people().find((p) => !p.openSeat)!.slug
bilingual('7.10-3', `/team-members/${people().find((p) => !p.openSeat)?.slug ?? 'x'}`, async ({ page, path, lang }) => {
  const res = await page.request.get(path, { maxRedirects: 0 })
  expect(res.status()).toBe(301)
  expect(new URL(res.headers().location ?? '', 'http://x').pathname).toBe(inLang(`/our-team/${someBio()}`, lang))
})

// --- 7.11 Financials & Transparency ---------------------------------------------------------

const reports = (kind: string) =>
  english('articles', 'resources')
    .filter((a) => (a.data.report_type ?? a.data.report_kind) === kind)
    .sort((a, b) => String(b.data.publish_date ?? b.data.published_on).localeCompare(String(a.data.publish_date ?? a.data.published_on)))

bilingual('7.11-1', '/financials-and-transparency', async ({ page, path, lang }) => {
  await open(page, path)
  const quarterly = reports('quarterly').map((r) => inLang(`/resources/${r.slug}`, lang))
  const shown = [...new Set((await hrefsIn(page)).filter((h) => quarterly.includes(h)))]
  expect(shown, 'quarterly reports, newest first').toEqual(quarterly)
})

bilingual('7.11-2', '/financials-and-transparency', async ({ page, path, lang }) => {
  await open(page, path)
  for (const r of [...reports('annual'), ...reports('quarterly')]) {
    const pdf = r.data.report_pdf ?? r.data.file
    const card = page.locator('main li, main article').filter({ has: page.locator(`a[href="${inLang(`/resources/${r.slug}`, lang)}"]`) }).first()
    const downloads = await card.locator('a[href$=".pdf"], a[download], a[href*="/media/file/"]').count()
    if (pdf) expect(downloads, `${r.slug}: Download`).toBeGreaterThan(0)
    else expect(downloads, `${r.slug}: no Download`).toBe(0)
  }
})

bilingual('7.11-3', '/financials-and-transparency', async ({ page, path }) => {
  await open(page, path)
  const board = people().filter((p) => p.groups.has('board') && !p.openSeat)
  const names = english('team_members').filter((m) => board.some((b) => b.slug === String(m.data.profile_slug ?? m.slug))).map((m) => String(m.data.name))
  const section = page.locator('main section').filter({ hasText: /board|junta/i }).last()
  for (const n of new Set(names)) await expect(section, `board member ${n}`).toContainText(n)
})
