// Spec pages 7.12 to 7.19: Resources, Article, Contact, Earthquake Relief,
// Thank-you pages, Our Programs.
import { expect, test, type Page } from '@playwright/test'
import { bilingual, open, english, hrefsIn, inLang, jsonLdBlocks, LANGS, single, SPEC_PAGES, THANK_YOU_PAGES, type Lang } from './helpers'


const articles = () => english('articles', 'resources')
// Seed categories are `$ref:category-<slug>` (or plain slugs in the earlier model).
const inCategory = (a: { data: Record<string, any> }, slug: string) =>
  [slug, `cat-${slug}`, `$ref:category-${slug}`].includes(a.data.category) || ((a.data.categories as string[] | undefined) ?? []).includes(slug)
const dateOf = (a: { data: Record<string, any> }) => String(a.data.publish_date ?? a.data.published_on ?? '')
const articleLinks = async (page: Page, selector = 'main') =>
  (await hrefsIn(page, selector)).filter((h) => /\/resources\/[^/]+$/.test(h) && !/\/resources\/(stories|financials|news)$/.test(h))

// --- 7.12 Resources ----------------------------------------------------------------

const story = () => articles().filter((a) => inCategory(a, 'stories') && !a.data.external).sort((a, b) => dateOf(b).localeCompare(dateOf(a)))[0]
const storyOnly = () => articles().find((a) => inCategory(a, 'stories') && !inCategory(a, 'financials') && !inCategory(a, 'financials-transparency'))

for (const lang of LANGS as Lang[]) {
  single('7.12-1', `${lang} Stories article placement`, async ({ page }) => {
    const s = storyOnly() ?? story()
    expect(s, 'a Stories article exists').toBeTruthy()
    const href = inLang(`/resources/${s!.slug}`, lang)
    for (const listing of ['/resources', '/resources/stories']) {
      await open(page, inLang(listing, lang))
      expect(await articleLinks(page), `${href} on ${inLang(listing, lang)}`).toContain(href)
    }
    await open(page, inLang('/resources/financials', lang))
    expect(await articleLinks(page), `${href} not on Financial Reports`).not.toContain(href)
  })
}

for (const listing of ['/resources', '/resources/stories', '/resources/financials']) {
  bilingual('7.12-2', listing, async ({ page, path }) => {
    await open(page, path)
    // Every article appears once in the listing; the sidebar's Related list is separate.
    const links = (
      await page.$$eval('main a[href]', (as) => as.filter((a) => !a.closest('aside')).map((a) => new URL((a as HTMLAnchorElement).href).pathname))
    ).filter((h) => /\/resources\/[^/]+$/.test(h) && !/\/resources\/(stories|financials|news)$/.test(h))
    const twice = [...new Set(links.filter((h, i) => links.indexOf(h) !== i))]
    expect(twice, 'articles shown more than once').toEqual([])
  })
}

bilingual('7.12-3', '/resources', async ({ page, path }) => {
  test.skip(articles().length <= 7, 'needs more than one page of articles')
  const res = await page.goto(`${path}?page=2`, { waitUntil: 'domcontentloaded' })
  expect(res?.status()).toBe(200)
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(new URL(canonical ?? '', 'http://x').search, 'page 2 canonical points to itself').toBe('?page=2')
  const first = await (async () => {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    return articleLinks(page)
  })()
  await page.goto(`${path}?page=2`, { waitUntil: 'domcontentloaded' })
  expect((await articleLinks(page)).filter((h) => first.includes(h) && !h.includes('?')).length, 'page 2 shows other articles').toBeLessThan((await articleLinks(page)).length)
})

bilingual('7.12-4', '/resources', async ({ page, path, lang }) => {
  const press = articles().filter((a) => a.data.external)
  test.skip(press.length === 0, 'no external (press) article in the seed')
  await open(page, path)
  for (const a of press) {
    const card = page.locator(`main a[href="${a.data.external_url}"]`).first()
    await expect(card).toHaveAttribute('target', '_blank')
    const own = await page.request.get(inLang(`/resources/${a.slug}`, lang), { maxRedirects: 0 })
    expect(own.status(), `no page for ${a.slug}`).toBe(404)
  }
})

// --- 7.13 Article ----------------------------------------------------------------------

for (const lang of LANGS as Lang[]) {
  single('7.13-1', `${lang} no PDF, no download`, async ({ page }) => {
    const noPdf = articles().find((a) => !a.data.report_pdf && !a.data.file && !a.data.external)
    test.skip(!noPdf, 'every article has a PDF')
    await open(page, inLang(`/resources/${noPdf!.slug}`, lang))
    await expect(page.locator('main a[href$=".pdf"], main a[download], main a[href*="/media/file/"]')).toHaveCount(0)
  })

  single('7.13-2', `${lang} two authors in order`, async ({ page }) => {
    const two = articles().find((a) => ((a.data.authors as unknown[]) ?? []).length === 2 && !a.data.external)
    test.skip(!two, 'no article with two authors')
    // Author refs are seed `$ref:<id>` values (or inline names in the earlier model).
    const names = (two!.data.authors as ({ name?: string } | string)[]).map((x) =>
      typeof x === 'string' ? (english('authors').find((au) => au.id === x.replace(/^\$ref:/, ''))?.data.name as string) : x.name
    )
    await open(page, inLang(`/resources/${two!.slug}`, lang))
    const text = (await page.locator('main').textContent()) ?? ''
    const positions = names.map((n) => text.indexOf(String(n)))
    expect(positions.every((p) => p >= 0), `both authors shown: ${names.join(', ')}`).toBe(true)
    expect(positions[0]).toBeLessThan(positions[1])
  })

  single('7.13-3', `${lang} Related excludes itself`, async ({ page }) => {
    for (const a of articles().filter((x) => !x.data.external)) {
      const href = inLang(`/resources/${a.slug}`, lang)
      await open(page, href)
      const related = await articleLinks(page, 'aside')
      expect(related, `${a.slug}: Related`).not.toContain(href)
    }
  })

  // Structure only: the online validator isn't reachable from the test run.
  single('7.13-4', `${lang} Article structured data`, async ({ page }) => {
    for (const a of articles().filter((x) => !x.data.external)) {
      await open(page, inLang(`/resources/${a.slug}`, lang))
      const blocks = (await jsonLdBlocks(page)).filter((b) => b['@type'] === 'Article')
      expect(blocks, `${a.slug}: one Article block`).toHaveLength(1)
      const b = blocks[0]
      for (const k of ['headline', 'image', 'datePublished', 'dateModified', 'author', 'publisher']) expect(b[k], `${a.slug}: ${k}`).toBeTruthy()
      expect(b.headline).toBe((await page.locator('h1').first().textContent())?.trim())
      expect(b.publisher.name).toBe('Victoria Venezuela Foundation')
    }
  })
}

// --- 7.14 Contact ------------------------------------------------------------------------

const TOPIC_LINKS: [string, string][] = [
  ['/sponsor-a-child', 'Child sponsorship'],
  ['/ways-to-give', 'Donation support'],
  ['/our-team', 'Volunteering'],
  ['/our-team', 'Other'],
]
const TOPICS = ['General inquiry', 'Donation support', 'Child sponsorship', 'Media and press', 'Corporate partnership', 'Events', 'Volunteering', 'Other']

for (const lang of LANGS as Lang[]) {
  single('7.14-1', `${lang} topic links`, async ({ page }) => {
    for (const [from, topic] of TOPIC_LINKS) {
      const link = `${inLang('/contact', lang)}?topic=${encodeURIComponent(topic)}`
      await open(page, inLang(from, lang))
      expect(await hrefsIn(page), `${inLang(from, lang)} links to ${link}`).toContain(link)
      await open(page, link)
      await expect(page.locator('select[name="topic"]')).toHaveValue(topic)
    }
  })
}

bilingual('7.14-2', '/contact', async ({ page, path }) => {
  await open(page, path)
  const form = page.locator('main form').first()
  for (const name of ['firstName', 'lastName', 'email', 'topic', 'message']) {
    await expect(form.locator(`[name="${name}"]`), `${name} is required`).toHaveAttribute('required', '')
  }
  await expect(form.locator('input[type="checkbox"]'), 'consent is required').toHaveAttribute('required', '')
  // Sending empty stays on the page.
  let posted = false
  page.on('request', (r) => {
    if (r.method() === 'POST') posted = true
  })
  await form.locator('[type="submit"]').click({ force: true })
  expect(posted, 'nothing sent').toBe(false)
})

bilingual('7.14-3', '/contact', async ({ page, path }) => {
  await open(page, path)
  const form = page.locator('main form').first()
  expect(await form.getAttribute('action'), 'the form posts somewhere').toBeTruthy()
  expect((await form.getAttribute('method'))?.toLowerCase()).toBe('post')
  const values = await form.locator('select[name="topic"] option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean))
  expect(values, 'stored topic values are the English names').toEqual(TOPICS)
})

// --- 7.15 Venezuela Earthquake Relief --------------------------------------------------------

bilingual('7.15-1', '/venezuela-earthquake-relief', async ({ page, path }) => {
  await open(page, path)
  const donorbox = (await hrefsIn(page)).filter((h) => h.includes('donorbox.org'))
  expect(donorbox.length, 'Donate buttons').toBeGreaterThan(0)
  for (const h of donorbox) expect(h, 'earthquake campaign only').toContain('donorbox.org/venezuela-earthquake-relief')
})

for (const p of ['/venezuela-earthquake-relief', '/ways-to-give']) {
  bilingual('7.15-2', p, async ({ page, path, lang }) => {
    await open(page, path)
    const renders = page.locator('main img').filter({ has: page.locator('xpath=self::*[contains(translate(@alt,"RENDRÓ","rendró"),"render") or contains(translate(@alt,"REPRSNTACIÓ","reprsntació"),"representación")]') })
    const count = await renders.count()
    expect(count, 'page shows the centre render').toBeGreaterThan(0)
    for (const r of await renders.all()) {
      const caption = r.locator('xpath=ancestor::figure[1]//figcaption | ancestor::section[1]')
      await expect(caption.first(), 'AI-render caption beside the render').toContainText(lang === 'es' ? /\bIA\b|inteligencia artificial/i : /\bAI\b|artificial intelligence/i)
    }
  })
}

// --- 7.17 Thank-you pages --------------------------------------------------------------------

for (const p of THANK_YOU_PAGES) {
  bilingual('7.17-1', p, async ({ page, path }) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    expect(res.status()).toBe(200)
    expect(await res.text()).toMatch(/<meta name="robots" content="[^"]*noindex/)
  })
}

for (const lang of LANGS as Lang[]) {
  single('7.17-2', `${lang} no links to thank-you pages`, async ({ page }) => {
    for (const p of SPEC_PAGES.filter((x) => !(THANK_YOU_PAGES as readonly string[]).includes(x))) {
      const res = await page.goto(inLang(p, lang), { waitUntil: 'domcontentloaded' })
      if (res?.status() !== 200) continue
      expect((await hrefsIn(page, 'body')).filter((h) => h.includes('/thank-you-')), inLang(p, lang)).toEqual([])
    }
  })
}

// --- 7.19 Our Programs -------------------------------------------------------------------------

const BLOCKS = ['#programs', '#medical-care', '#education']

bilingual('7.19-1', '/our-programs', async ({ page, path }) => {
  await open(page, path)
  const explore = page.locator('main section').first().locator('a[href$="#programs"]').first()
  await expect(explore, 'Explore links to the Nutrition block').toBeVisible()
  await explore.click()
  await expect(page.locator('#programs')).toBeInViewport()
})

bilingual('7.19-2', '/our-programs', async ({ page, path }) => {
  await open(page, path)
  for (const id of BLOCKS) {
    const block = page.locator(id)
    await expect(block, `${id} block`).toHaveCount(1)
    const photos = await block.locator('img').count()
    const dots = await block.locator('[role="tab"], button[aria-label*="photo" i], button[aria-label*="foto" i], [data-dot]').count()
    expect(dots, `${id}: one dot per photo, none for one`).toBe(photos > 1 ? photos : 0)
  }
})

bilingual('7.19-3', '/our-programs', async ({ page, path }) => {
  await open(page, path)
  const block = page.locator('#programs')
  const track = block.locator('[data-track], ul').first()
  await expect(track, 'photo track').toBeVisible()
  await track.scrollIntoViewIfNeeded()
  const box = (await track.boundingBox())!
  const before = await track.evaluate((t) => t.scrollLeft)
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(before)
})

bilingual('7.19-4', '/our-programs', async ({ page, path, lang }) => {
  await open(page, path)
  const hrefs = await hrefsIn(page)
  expect(hrefs, 'Support / Sponsor').toContain(inLang('/sponsor-a-child', lang))
  expect(hrefs, 'Donate').toContain(inLang('/ways-to-give', lang))
})
