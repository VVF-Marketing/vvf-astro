import { localizePath, type Locale } from './i18n'

// Pages and components write internal links as English paths ("/ways-to-give").
// On a Spanish page those links are rewritten to their /es equivalents here,
// once, instead of every link site having to remember to localize — this also
// covers links inside CMS rich text.
//
// Left untouched: external and protocol-relative URLs, anchors, static assets
// and EmDash/Astro internals, and any <a> carrying `hreflang` (the language
// switch, which points at the other locale on purpose).

const TAG = /<(a|form)\b[^>]*>/gi
const ATTR = /(\s(?:href|action)\s*=\s*)(["'])(\/[^"']*)\2/gi
const SKIP_PATH = /^\/(?:\/|_emdash|_astro|_image|images\/|uploads\/|favicon)|\.[a-z0-9]{2,5}(?:[?#]|$)/i

export function localizeLinks(html: string, locale: Locale): string {
  if (locale === 'en') return html
  return html.replace(TAG, (tag) => {
    if (/\shreflang\s*=/i.test(tag)) return tag
    return tag.replace(ATTR, (match, attr: string, quote: string, path: string) =>
      SKIP_PATH.test(path) ? match : `${attr}${quote}${localizePath(path, locale)}${quote}`
    )
  })
}
