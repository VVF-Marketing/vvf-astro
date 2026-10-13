// The site's public address (same as `site` in astro.config.mjs) and helpers
// to recognize links that point back at it. Plain ESM so the migration
// scripts (scripts/migrate) share it with the app.
export const SITE_URL = 'https://www.victoriavenezuelafoundation.org'

const SITE_HOST = new URL(SITE_URL).hostname.replace(/^www\./, '')

/**
 * The path of a full address of this site (http or https, with or without
 * www), e.g. 'https://victoriavenezuelafoundation.org/es/events?x=1' ->
 * '/es/events?x=1'. Undefined for anything else (other sites, paths, mailto…).
 * @param {string} url
 * @returns {string | undefined}
 */
export function sameSitePath(url) {
  const m = url.trim().match(/^(?:https?:)?\/\/(?:www\.)?([^/?#:]+)(?::\d+)?([/?#].*)?$/i)
  if (!m || m[1].toLowerCase() !== SITE_HOST) return undefined
  const rest = m[2] ?? '/'
  return rest.startsWith('/') ? rest : `/${rest}`
}

// Keys that hold a link: rich-text `href`s and link fields (`url`,
// `customUrl`, `cta_url`, `appeal_cta_url`…).
export const LINK_KEY = /^(href|url|customUrl)$|_url$|Url$/

/**
 * A copy of `value` with every link to this site written as a path.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function relativizeSameSiteLinks(value, key) {
  if (typeof value === 'string') return /** @type {T} */ (key && LINK_KEY.test(key) ? (sameSitePath(value) ?? value) : value)
  if (Array.isArray(value)) return /** @type {T} */ (value.map((v) => relativizeSameSiteLinks(v)))
  if (value && typeof value === 'object') {
    return /** @type {T} */ (Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relativizeSameSiteLinks(v, k)])))
  }
  return value
}
