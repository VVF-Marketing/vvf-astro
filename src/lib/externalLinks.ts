import { sameSitePath } from './site.mjs'

// Links to other websites open in a new tab, whoever wrote them (code, CMS
// content, migrated HTML): `target="_blank"`, `rel` gaining `noopener`
// (never `noreferrer`, so partners and Donorbox still see visits came from
// here), and a screen-reader cue at the end of the link's accessible name.
// Applied to every HTML response by src/middleware.ts, after localizeLinks
// (openspec/changes/open-external-links-in-new-tab).
//
// A link that sets its own `target` is left alone (code's opt-out). Paths,
// anchors, mailto:, tel: and the site's own full address are not external.

const EXTERNAL = /^(?:https?:)?\/\//i

export function isExternalHref(href: string): boolean {
  const value = href.trim()
  return EXTERNAL.test(value) && sameSitePath(value) === undefined
}

const LINK = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// `cue` is plain text, e.g. "(opens in a new tab)".
export function openExternalLinks(html: string, cue: string): string {
  const safeCue = escapeHtml(cue)
  return html.replace(LINK, (whole, attrs: string, body: string) => {
    const href = attr(attrs, 'href')
    if (!href || !isExternalHref(href[2]) || attr(attrs, 'target')) return whole

    let out = `${attrs} target="_blank"`
    const rel = attr(out, 'rel')
    if (rel) {
      const values = rel[2].split(/\s+/).filter(Boolean)
      if (!values.some((v) => v.toLowerCase() === 'noopener')) values.push('noopener')
      out = out.replace(rel[0], ` rel=${rel[1]}${values.join(' ')}${rel[1]}`)
    } else {
      out += ' rel="noopener"'
    }

    // An aria-label sets the accessible name on its own, so the cue joins it;
    // otherwise visually hidden text inside the link extends the name (text
    // links and image links named by their alt alike).
    const label = attr(out, 'aria-label')
    if (label) {
      out = out.replace(label[0], ` aria-label=${label[1]}${label[2]} ${safeCue}${label[1]}`)
      return `<a${out}>${body}</a>`
    }
    return `<a${out}>${body}<span class="sr-only"> ${safeCue}</span></a>`
  })
}
