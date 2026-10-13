#!/usr/bin/env node
// Validates that every url in seed/seed.json's menus resolves to a real
// Astro route. Spanish (`locale: "es"`) menus must link to /es routes; /es
// paths are served by the same page files as their English paths. Never edits seed.json — report only, non-zero exit on any
// broken link. Run via `npm run verify-menu`; also wired into
// .github/workflows/verify-menu-links.yml.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = path.join(rootDir, 'src/pages')
const seedPath = path.join(rootDir, 'seed/seed.json')

function pageFileToRoute(filePath) {
  const relative = path.relative(pagesDir, filePath)
  const withoutExt = relative.replace(/\.(astro|md|mdx)$/, '')
  const segments = withoutExt.split(path.sep).filter((s) => s !== 'index')
  return '/' + segments.join('/')
}

function collectPageFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(astro|md|mdx)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
}

function buildRouteMatchers() {
  const routes = collectPageFiles(pagesDir).map(pageFileToRoute)
  const staticRoutes = new Set()
  const dynamicPatterns = []

  for (const route of routes) {
    if (!route.includes('[')) {
      staticRoutes.add(route === '' ? '/' : route)
      continue
    }
    const pattern = route
      .split('/')
      .map((segment) => {
        if (segment.startsWith('[...') && segment.endsWith(']')) return '.*'
        if (segment.startsWith('[') && segment.endsWith(']')) return '[^/]+'
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      })
      .join('/')
    dynamicPatterns.push(new RegExp(`^${pattern}$`))
  }

  return { staticRoutes, dynamicPatterns }
}

function normalizeUrl(url) {
  const withoutQuery = url.split('?')[0].split('#')[0]
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1)
  return withoutQuery
}

function isExternalOrIgnorable(url) {
  if (!url || url === '#') return true
  return /^[a-z]+:/i.test(url)
}

function collectMenuUrls(seed) {
  const found = []
  const walk = (items, menuName, locale) => {
    for (const item of items ?? []) {
      if (item.url) found.push({ menuName: `${menuName}:${locale}`, locale, label: item.label ?? '(unlabeled)', url: item.url })
      if (item.children) walk(item.children, menuName, locale)
    }
  }
  for (const menu of seed.menus ?? []) walk(menu.items, menu.name, menu.locale ?? 'en')
  return found
}

const ES_PREFIX = /^\/es(?=\/|$)/

function isValidRoute(url, locale, staticRoutes, dynamicPatterns) {
  // Each menu links within its own locale.
  if (locale === 'es' ? !ES_PREFIX.test(url) : ES_PREFIX.test(url)) return false
  const route = url.replace(ES_PREFIX, '') || '/'
  if (staticRoutes.has(route)) return true
  return dynamicPatterns.some((pattern) => pattern.test(route))
}

const { staticRoutes, dynamicPatterns } = buildRouteMatchers()
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
const menuUrls = collectMenuUrls(seed)
const checkable = menuUrls.filter(({ url }) => !isExternalOrIgnorable(url))

const broken = checkable.filter(({ url, locale }) => !isValidRoute(normalizeUrl(url), locale, staticRoutes, dynamicPatterns))

if (broken.length > 0) {
  console.error(`\n✗ ${broken.length} menu link(s) don't match any known route:\n`)
  for (const { menuName, label, url } of broken) {
    console.error(`  [${menuName}] "${label}" -> ${url}`)
  }
  console.error(`\nKnown static routes: ${[...staticRoutes].sort().join(', ')}\n`)
  process.exit(1)
}

console.log(`✓ All ${checkable.length} menu link(s) resolve to a real route.`)
