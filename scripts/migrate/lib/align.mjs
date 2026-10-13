// Builds an English → Spanish translation table from a live page and its /es
// counterpart. Webflow localization keeps a page's DOM structure in every
// locale, so walking both pages in document order and pairing nodes that sit
// at the same element path yields aligned translations — text nodes plus the
// alt / aria-label / placeholder / title attributes and the SEO head tags.
// Link text is paired by link target and element path first (/x ↔ /es/x in
// the same place): menus can differ in order or structure between the
// locales (or between cached copies), which would otherwise shift every
// positional pair after the difference.
import { load } from 'cheerio'

const ATTRS = ['alt', 'aria-label', 'placeholder', 'title']
const SKIP = 'script, style, noscript, svg'

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

// A link's target without origin, locale prefix or trailing slash, so the
// English and Spanish links to the same page compare equal.
export function linkKey(href) {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return undefined
  const path = href.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0]
  return (path.replace(/^\/es(?=\/|$)/, '').replace(/\/$/, '') || '/')
}

// Every translatable string on the page, in document order, with the element
// path it sits on (e.g. "div.hero > h1#text").
export function pageStrings(html) {
  const $ = load(html)
  $(SKIP).remove()
  const out = []
  const title = norm($('head > title').text())
  if (title) out.push({ path: 'head>title', text: title })
  const description = norm($('meta[name="description"]').attr('content'))
  if (description) out.push({ path: 'head>meta.description', text: description })

  const walk = (el, path, href) => {
    for (const node of $(el).contents().toArray()) {
      if (node.type === 'text') {
        const text = norm(node.data)
        if (/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(text)) out.push({ path: `${path}#text`, text, ...(href ? { href } : {}) })
      } else if (node.type === 'tag') {
        const cls = ($(node).attr('class') ?? '').split(/\s+/).filter(Boolean)[0]
        const p = `${path}>${node.name}${cls ? `.${cls}` : ''}`
        for (const a of ATTRS) {
          const v = norm($(node).attr(a))
          if (v && /[A-Za-z]/.test(v)) out.push({ path: `${p}@${a}`, text: v })
        }
        walk(node, p, node.name === 'a' ? linkKey($(node).attr('href')) : href)
      }
    }
  }
  walk($('body').get(0), 'body')
  return out
}

// Longest-common-subsequence alignment on element paths; returns
// Map<englishText, spanishText> for pairs whose text actually differs.
export function alignPages(enHtml, esHtml) {
  const table = new Map()
  const add = (a, b) => {
    if (a.text !== b.text && !table.has(a.text)) table.set(a.text, b.text)
  }
  // 1. Link text, by target + element path, in order of appearance.
  const allEn = pageStrings(enHtml)
  const allEs = pageStrings(esHtml)
  const byLink = (list) => {
    const m = new Map()
    for (const s of list) {
      if (!s.href) continue
      const key = `${s.href} ${s.path}`
      ;(m.get(key) ?? m.set(key, []).get(key)).push(s)
    }
    return m
  }
  const esLinks = byLink(allEs)
  const paired = new Set()
  for (const [key, enTexts] of byLink(allEn)) {
    const esTexts = esLinks.get(key) ?? []
    // Same number of text nodes for the link: pair them in order.
    if (esTexts.length !== enTexts.length) continue
    enTexts.forEach((s, i) => {
      add(s, esTexts[i])
      paired.add(s).add(esTexts[i])
    })
  }
  // 2. Everything else, by element path. Menu dropdown headings aren't
  //    links and the menus differ between locales, so they stay out (the
  //    menus themselves are maintained in the CMS).
  const positional = (s) => !paired.has(s) && !s.path.includes('dropdown-toggle')
  const en = allEn.filter(positional)
  const es = allEs.filter(positional)
  const n = en.length
  const m = es.length
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = en[i].path === es[j].path ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (en[i].path === es[j].path) {
      add(en[i], es[j])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return table
}

// Merges several page tables; the first translation seen for a string wins.
// Pairs the alignment gets wrong on the live pages, corrected here so a
// regenerated table keeps them (review finding on PR #15: the
// "Financials & Transparency" link lined up with "Nuestro equipo").
export const ALIGNMENT_CORRECTIONS = new Map([['Financials & Transparency', 'Finanzas y transparencia']])

// Text the live /es site never translated (it shows the English), translated
// here until marketing reviews the Spanish: the 2026 event's appeal card
// image descriptions (review finding on PR #15).
export const MISSING_TRANSLATIONS = new Map([
  ['Families arriving at the courtyard of the planned VVF support centre.', 'Familias llegando al patio del futuro centro de apoyo de VVF.'],
  ['A nurse examining a young girl while her mother sits beside her.', 'Una enfermera examina a una niña mientras su madre está sentada a su lado.'],
  ["Children eating a hot meal together in the centre's dining room.", 'Niños comiendo juntos una comida caliente en el comedor del centro.'],
])

export function corrected(table) {
  return mergeTables([ALIGNMENT_CORRECTIONS, MISSING_TRANSLATIONS, table])
}

export function mergeTables(tables) {
  const merged = new Map()
  for (const t of tables) for (const [k, v] of t) if (!merged.has(k)) merged.set(k, v)
  return merged
}

// Translates a value from the table, ignoring whitespace and typographic
// apostrophe differences; undefined when the table has no entry.
export function translate(table, text) {
  if (!text) return undefined
  const key = norm(text)
  if (table.has(key)) return table.get(key)
  const loose = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
  for (const [k, v] of table) if (loose(k) === loose(key)) return v
  return undefined
}
