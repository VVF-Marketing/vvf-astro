import { localizePath, type Locale } from './i18n'
import { sameSitePath } from './site.mjs'

// Links from a page to the rest of the site follow that page's language,
// however they were written: in code (English paths, "/ways-to-give"), in CMS
// content by editors (a full address of the site, or the other language's
// /es prefix), or migrated from Webflow. Applied once to every HTML response
// (src/middleware.ts), so no link site has to remember to localize.
//
// Left untouched: other sites, anchors, mailto/tel, static assets and
// EmDash/Astro internals, and any <a> carrying `hreflang` (the language
// switch, which points at the other locale on purpose).

const TAG = /<(a|form)\b[^>]*>/gi
const ATTR = /(\s(?:href|action)\s*=\s*)(["'])([^"']*)\2/gi
const SKIP_PATH = /^\/(?:\/|_emdash|_astro|_image|images\/|uploads\/|favicon)|\.[a-z0-9]{2,5}(?:[?#]|$)/i

export function localizeLinks(html: string, locale: Locale): string {
  return html.replace(TAG, (tag) => {
    if (/\shreflang\s*=/i.test(tag)) return tag
    return tag.replace(ATTR, (match, attr: string, quote: string, href: string) => {
      const path = href.startsWith('/') && !href.startsWith('//') ? href : sameSitePath(href)
      if (path === undefined || SKIP_PATH.test(path)) return match
      return `${attr}${quote}${localizePath(path, locale)}${quote}`
    })
  })
}
