// Spec section 5: design system (checks 5.9-1, 3, 4, 6, 7, 8, 9, 10).
import { expect, test, type Page } from '@playwright/test'
import { bilingual, HAS_CHILD_DATA, NO_CHILD_DATA, open, LANGS, single, SPEC_PAGES } from './helpers'
import tokens from '../../src/styles/tokens.cjs'

const WIDTHS = [1440, 1280, 768, 440, 375]
const isPhone = (w: number) => w < 768


// 5.9-1 and 5.9-9: the viewport sweep (slow; `layout` project).
for (const p of SPEC_PAGES) {
  bilingual(
    '5.9-1',
    p,
    async ({ page, path }) => {
      const problems: string[] = []
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await open(page, path)
        // Whether the visitor can actually scroll sideways (clipped marquees don't count).
        const overflow = await page.evaluate(() => {
          window.scrollTo(100000, window.scrollY)
          const x = window.scrollX
          window.scrollTo(0, window.scrollY)
          return x
        })
        if (overflow > 0) problems.push(`${width}px: scrolls sideways by ${overflow}px`)
      }
      expect(problems).toEqual([])
    },
    { tags: ['@layout'] }
  )

  bilingual(
    '5.9-9',
    p,
    async ({ page, path }) => {
      const problems: string[] = []
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await open(page, path)
        // Buttons are the pill-shaped links and buttons (5.4 radius-pill).
        const wrapped = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('a, button')]
            .filter((el) => {
              const s = getComputedStyle(el)
              const r = el.getBoundingClientRect()
              return r.width > 0 && parseFloat(s.borderTopLeftRadius) >= r.height / 2 - 1 && (el.textContent ?? '').trim()
            })
            .filter((el) => {
              // Visible text only: screen-reader text (sr-only) is positioned off the line.
              const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
              const tops = new Set<number>()
              for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                const parent = n.parentElement
                if (!parent || getComputedStyle(parent).position === 'absolute' || !n.textContent?.trim()) continue
                const range = document.createRange()
                range.selectNodeContents(n)
                for (const r of range.getClientRects()) if (r.width > 1) tops.add(Math.round(r.top))
              }
              return tops.size > 1
            })
            .map((el) => (el.textContent ?? '').trim().replace(/\s+/g, ' '))
        )
        for (const label of wrapped) problems.push(`${width}px: "${label}" wraps`)
      }
      expect(problems).toEqual([])
    },
    { tags: ['@layout'] }
  )
}

// 5.9-3: only Nunito and Open Sans load.
for (const lang of LANGS) {
  single('5.9-3', `${lang} fonts`, async ({ page }) => {
    const families = new Set<string>()
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.hostname === 'fonts.googleapis.com') for (const f of url.searchParams.getAll('family')) families.add(f.split(':')[0])
    })
    await open(page, lang === 'es' ? '/es' : '/')
    await page.evaluate(() => document.fonts.ready)
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))
    const all = [...new Set([...families, ...loaded])]
    expect(all.filter((f) => !['Nunito', 'Open Sans'].includes(f))).toEqual([])
  })
}

// 5.9-4: one H1, and heading sizes by level (5.2). The newsletter card title is a named exception (5.8).
// Rich text (articles, Privacy Policy) follows the article heading instead: H2 32/28 Bold (v0.25);
// its H3/H4 have no size in the spec and aren't checked.
// Styles are by job (5.2): a card title is an H3 tag (6.1, rule 2) in the
// large (H3) or small (H4) card-title style; sidebar headings use the small one.
type Style = [number, number, number] // desktop px, phone px, weight
const H1: Style = [48, 36, 800]
const H2: Style = [48, 36, 800]
const LARGE_CARD: Style = [32, 24, 700]
const SMALL_CARD: Style = [20, 20, 800]
const SIZES: Record<string, Style[]> = { H1: [H1], H2: [H2], H3: [LARGE_CARD, SMALL_CARD], H4: [SMALL_CARD] }
for (const p of SPEC_PAGES) {
  bilingual('5.9-4', p, async ({ page, path }) => {
    const problems: string[] = []
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, path)
      const heads = await page.$$eval('h1, h2, h3, h4', (hs) =>
        hs
          .filter((h) => (h as HTMLElement).offsetParent !== null)
          .map((h) => {
            const s = getComputedStyle(h)
            const rich = Boolean(h.closest('[class*="[&_h2]"]'))
            const aside = Boolean(h.closest('aside'))
            return { tag: h.tagName, rich, aside, size: parseFloat(s.fontSize), weight: Number(s.fontWeight), text: (h.textContent ?? '').trim().slice(0, 40) }
          })
      )
      const h1s = heads.filter((h) => h.tag === 'H1')
      if (h1s.length !== 1) problems.push(`${width}px: ${h1s.length} H1`)
      for (const h of heads) {
        if (/^(stay connected|mantente conectado)/i.test(h.text)) continue
        if (h.rich && h.tag !== 'H2') continue
        const styles: Style[] = h.rich ? [[32, 28, 700]] : h.aside ? [SMALL_CARD] : SIZES[h.tag]
        const ok = styles.some(([desktop, phone, weight]) => h.size === (isPhone(width) ? phone : desktop) && h.weight === weight)
        const want = styles.map(([d, ph, w]) => `${isPhone(width) ? ph : d}px/${w}`).join(' or ')
        if (!ok) problems.push(`${width}px ${h.tag} "${h.text}": ${h.size}px/${h.weight}, want ${want}`)
      }
    }
    expect(problems).toEqual([])
  })

  // 5.9-6: section padding is 0, 64 or 120 (desktop) and 0, 40 or 64 (phones).
  bilingual('5.9-6', p, async ({ page, path }) => {
    const problems: string[] = []
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, path)
      const allowed = isPhone(width) ? [0, 40, 64] : [0, 64, 120]
      const pads = await page.$$eval('main section', (ss) =>
        ss
          .filter((s) => !s.parentElement?.closest('section'))
          .map((s) => {
            const st = getComputedStyle(s)
            return { id: s.id || s.className.toString().slice(0, 40), top: parseFloat(st.paddingTop), bottom: parseFloat(st.paddingBottom) }
          })
      )
      for (const s of pads) {
        if (!allowed.includes(s.top) || !allowed.includes(s.bottom)) problems.push(`${width}px section "${s.id}": ${s.top}/${s.bottom}`)
      }
    }
    expect(problems).toEqual([])
  })

  // 5.9-7: content photos crop to their frame.
  bilingual('5.9-7', p, async ({ page, path }) => {
    await open(page, path)
    // Lazy images below the fold may never load here; loaded ones are checked.
    const stretched = await page.$$eval('main img', (imgs) =>
      (imgs as HTMLImageElement[])
        .filter((i) => i.naturalWidth > 0 && i.width > 0 && i.height > 0)
        .filter((i) => {
          const fit = getComputedStyle(i).objectFit
          if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') return false
          const natural = i.naturalWidth / i.naturalHeight
          const shown = i.width / i.height
          return Math.abs(natural - shown) / natural > 0.02
        })
        .map((i) => i.currentSrc.split('/').pop())
    )
    expect(stretched).toEqual([])
  })

  // 5.9-10: no id appears twice. Only the document's own ids: Playwright's
  // selectors reach into open shadow roots, and Donorbox's <dbox-widget> on
  // /ways-to-give repeats ids inside its own, which can't clash with ours.
  bilingual('5.9-10', p, async ({ page, path }) => {
    await open(page, path)
    const dupes = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
      return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    })
    expect(dupes).toEqual([])
  })
}

// 5.9-8: keyboard and touch on the interactive components.
for (const lang of LANGS) {
  const L = (p: string) => (lang === 'es' ? (p === '/' ? '/es' : `/es${p}`) : p)

  single('5.9-8', `${lang} FAQ accordion by keyboard`, async ({ page }) => {
    await open(page, L('/ways-to-give'))
    const toggle = page.locator('[aria-expanded]').filter({ hasNotText: /^$/ }).locator('visible=true').first()
    await expect(toggle, 'accordion rows carry aria-expanded').toHaveCount(1)
    await toggle.focus()
    const before = await toggle.getAttribute('aria-expanded')
    await page.keyboard.press('Enter')
    await expect(toggle).not.toHaveAttribute('aria-expanded', before ?? '')
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', before ?? 'false')
  })

  single('5.9-8', `${lang} tabs by arrow keys`, async ({ page }) => {
    await open(page, L('/corporate-sponsorships'))
    const tabs = page.getByRole('tab')
    expect(await tabs.count(), 'sponsor packages use tabs').toBeGreaterThan(1)
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()
  })

  single('5.9-8', `${lang} carousel arrows by keyboard`, async ({ page }) => {
    // The carousel lists available children, so it isn't rendered without them.
    test.skip(!HAS_CHILD_DATA, NO_CHILD_DATA)
    await open(page, L('/sponsor-a-child'))
    const carousel = page.locator('[data-child-carousel], [data-carousel]').first()
    const next = carousel.locator('button:visible').last()
    await expect(next, 'carousel has a visible arrow button').toBeVisible()
    const track = carousel.locator('[data-track], ul').first()
    const before = await track.evaluate((t) => t.scrollLeft)
    await next.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(before)
  })

  single('5.9-8', `${lang} phone menu by touch`, async ({ page: desktop }) => {
    const context = await desktop.context().browser()!.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    await open(page, L('/'))
    const burger = page.locator('[aria-expanded]').filter({ has: page.locator('svg') }).locator('visible=true').first()
    await burger.tap()
    await expect(burger).toHaveAttribute('aria-expanded', 'true')
    await context.close()
  })
}

// 5.9-2: every colour in the site's CSS (the stylesheets public pages load)
// is a palette token (5.1, from src/styles/tokens.cjs) or a shadow token
// (5.4, 5.6).
const PALETTE: string[] = Object.values(tokens.colors as Record<string, string>).map((v) => v.toLowerCase())
const SHADOWS = ['rgba(2,51,94,0.06)', 'rgba(0,0,0,0.18)', 'rgba(2,51,94,0.12)']

export function offPalette(css: string): string[] {
  const found = new Set<string>()
  for (const m of css.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    let v = m[1].toLowerCase()
    if (v.length === 3 || v.length === 4) v = [...v].map((c) => c + c).join('')
    if (v.length === 8 && v.endsWith('00')) continue // fully transparent
    if (!PALETTE.includes(`#${v.slice(0, 6)}`)) found.add(`#${v}`)
  }
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi)) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number)
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4])
    if (a === 0 || SHADOWS.includes(`rgba(${r},${g},${b},${a})`)) continue
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
    if (!PALETTE.includes(hex)) found.add(m[0].replace(/\s+/g, ''))
  }
  return [...found]
}

single('5.9-2', 'site CSS', async ({ page }) => {
  const sheets = new Set<string>()
  for (const p of SPEC_PAGES) {
    for (const lang of LANGS) {
      const res = await page.request.get(lang === 'es' ? (p === '/' ? '/es' : `/es${p}`) : p)
      if (res.status() !== 200) continue
      for (const m of (await res.text()).matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]*rel="stylesheet"/g)) sheets.add(m[1] ?? m[2])
    }
  }
  const problems: string[] = []
  for (const href of sheets) {
    if (/^https?:/.test(href)) continue // Google Fonts
    const off = offPalette(await (await page.request.get(href)).text())
    if (off.length) problems.push(`${href}: ${off.join(' ')}`)
  }
  expect(problems).toEqual([])
})
