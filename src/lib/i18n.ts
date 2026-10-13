// Site locales (mirrors `i18n` in astro.config.mjs): en-US is the default and
// unprefixed, es-VE lives under /es. EmDash stores content rows as `en`/`es`.

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

// BCP 47 tags for <html lang> and hreflang.
export const LANG_TAGS: Record<Locale, string> = { en: 'en-US', es: 'es-VE' }

const ES_PREFIX = /^\/es(?=\/|$)/

// Normalizes Astro.currentLocale (or any locale code) to a site locale.
export function toLocale(value: string | undefined | null): Locale {
  return value?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function localeFromPath(pathname: string): Locale {
  return ES_PREFIX.test(pathname) ? 'es' : 'en'
}

// '/es/events/x' -> '/events/x', '/es' -> '/'. Unprefixed paths pass through.
export function stripLocale(pathname: string): string {
  return pathname.replace(ES_PREFIX, '') || '/'
}

// Path of `pathname` (with or without a locale prefix) in `locale`.
// External URLs, anchors and mailto/tel links are returned unchanged.
export function localizePath(pathname: string, locale: Locale): string {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return pathname
  const base = stripLocale(pathname)
  if (locale === DEFAULT_LOCALE) return base
  return base === '/' ? '/es' : `/es${base}`
}

// Per-locale paths of a detail page from its slug in each locale, e.g.
// ('/events', { en: 'golf', es: 'golf-es' }) -> { en: '/events/golf', es: '/es/events/golf-es' }.
export function alternatePaths(
  base: string,
  slugs: Partial<Record<Locale, string>> | undefined
): Partial<Record<Locale, string>> | undefined {
  if (!slugs) return undefined
  return Object.fromEntries(
    (Object.entries(slugs) as [Locale, string][]).map(([l, slug]) => [l, localizePath(`${base}/${slug}`, l)])
  )
}

// Per-locale paths of a static page that has its own copy in `locales`.
export function pageAlternates(route: string, locales: Locale[]): Partial<Record<Locale, string>> {
  return Object.fromEntries(locales.map((l) => [l, localizePath(route, l)]))
}
