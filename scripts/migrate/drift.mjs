#!/usr/bin/env node
// `npm run migrate:drift`: which live strings the build doesn't contain.
//
// Compares each page snapshot (scripts/migrate/snapshot/pages, or es/pages
// with `--es`) with the build's content: seed/seed.json, the Spanish page
// copy, and every source file under src/ (copy defaults live in the
// `_copy.ts` manifests). Lists, per page, every visible text, image
// description and SEO title or description that appears nowhere in it.
// Quotes, dashes, spacing and case don't count as differences. A report,
// not a gate: it always exits 0. Re-run `npm run migrate:extract` first for
// an up-to-date comparison.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT_DIR, SNAPSHOT_DIR } from './lib/paths.mjs'

const BRAND_SUFFIX = / \| (Victoria Venezuela Foundation|Fundación Victoria Venezuela)$/

export function normalize(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[ ​-‍]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Letters, digits and the punctuation that changes meaning in numbers only:
// a heading split over two elements still matches its joined form.
const squeeze = (text) => normalize(text).replace(/[^\p{L}\p{N}$%+,.]/gu, '')

// Portable Text bookkeeping between a block's spans, skipped so the spans of
// one sentence stay next to each other.
const SKIPPED_KEYS = new Set(['_key', '_type', 'style', 'listItem', 'level', 'marks', 'markDefs'])

// Every string in a JSON value, depth first.
export function* strings(value) {
  if (typeof value === 'string') yield value
  else if (Array.isArray(value)) for (const v of value) yield* strings(v)
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!SKIPPED_KEYS.has(k)) yield* strings(v)
}

export function buildCorpus(texts) {
  const joined = texts.map((t) => normalize(t.replace(/<[^>]+>/g, ' '))).join('\n')
  return { plain: joined, squeezed: squeeze(joined) }
}

export function contains(corpus, text) {
  return corpus.plain.includes(normalize(text)) || corpus.squeezed.includes(squeeze(text))
}

// The strings of one page snapshot worth comparing: SEO title and
// description (without the brand suffix), visible text, image descriptions.
export function pageStrings(page) {
  const out = []
  for (const key of ['title', 'description']) {
    const value = page.seo?.[key]
    if (value) out.push({ kind: `seo.${key}`, text: value.replace(BRAND_SUFFIX, '') })
  }
  for (const section of page.sections ?? []) {
    for (const block of section.blocks ?? []) {
      const text = block.type === 'image' ? block.alt : block.text
      if (text && text.trim().length >= 3) out.push({ kind: block.type, text, href: block.href })
    }
  }
  return out
}

export function missingStrings(page, corpus) {
  const seen = new Set()
  return pageStrings(page).filter(({ text }) => {
    const key = normalize(text)
    if (seen.has(key) || contains(corpus, text)) return false
    seen.add(key)
    return true
  })
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name)
    return statSync(file).isDirectory() ? filesUnder(file) : [file]
  })
}

function readCorpus() {
  const texts = []
  for (const rel of ['seed/seed.json', 'seed/page-copy.es.json']) {
    const file = path.join(ROOT_DIR, rel)
    if (existsSync(file)) texts.push(...strings(JSON.parse(readFileSync(file, 'utf8'))))
  }
  for (const file of filesUnder(path.join(ROOT_DIR, 'src'))) {
    if (/\.(astro|ts|mjs|json)$/.test(file) && !/\.(test|stories)\.ts$/.test(file)) texts.push(readFileSync(file, 'utf8'))
  }
  return buildCorpus(texts)
}

export function driftReport({ spanish = false } = {}) {
  const dir = path.join(SNAPSHOT_DIR, spanish ? 'es/pages' : 'pages')
  const corpus = readCorpus()
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const page = JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
      return { path: page.path, missing: missingStrings(page, corpus) }
    })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const spanish = process.argv.includes('--es')
  const report = driftReport({ spanish })
  let total = 0
  for (const { path: pagePath, missing } of report) {
    total += missing.length
    console.log(`\n${spanish ? '/es' : ''}${pagePath}: ${missing.length} missing`)
    for (const m of missing) console.log(`  - ${m.kind}: ${m.text.slice(0, 200)}${m.href ? ` → ${m.href}` : ''}`)
  }
  console.log(`\n${total} live strings not found in the build (${report.length} pages).`)
}
