// Webflow rich text → clean HTML → Portable Text / plain text.
import { gutenbergToPortableText, htmlToPortableText } from '@emdash-cms/gutenberg-to-portable-text'
import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote', 'img', 'br', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td']

// Layout wrappers whose content is kept; not worth reporting.
const UNWRAPPED_TAGS = ['span', 'div', 'u', 'sup', 'sub']

// Strips Webflow classes/ids/embeds, keeps structure, and rewrites image
// URLs through `rewriteSrc` (source URL → local URL, or undefined to drop
// the image). Returns { html, dropped } where `dropped` lists removed tags.
export function sanitizeRichText(html, { rewriteSrc = (src) => src } = {}) {
  const dropped = new Set(
    [...(html ?? '').matchAll(/<([a-z][a-z0-9]*)\b/gi)]
      .map((m) => m[1].toLowerCase())
      .filter((tag) => !ALLOWED_TAGS.includes(tag) && !UNWRAPPED_TAGS.includes(tag))
  )
  const clean = sanitizeHtml(html ?? '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href'], img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    nonTextTags: ['script', 'style', 'noscript', 'iframe', 'textarea', 'option'],
    exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren?.length,
    transformTags: {
      b: 'strong',
      i: 'em',
      img: (tagName, attribs) => {
        const src = rewriteSrc(attribs.src)
        return src ? { tagName, attribs: { ...attribs, src } } : { tagName: 'span', attribs: {} }
      },
    },
  })
  return { html: clean.trim(), dropped: [...dropped] }
}

// Deterministic block keys so regenerated seeds diff cleanly.
// Tables go through the converter's Gutenberg table transformer (the plain
// HTML path flattens them into a paragraph); everything else through the
// plain HTML path.
export function toPortableText(html, keyPrefix = 'b') {
  if (!html) return undefined
  let n = 0
  const options = { keyGenerator: () => `${keyPrefix}${(n++).toString(36)}` }
  const blocks = html
    .split(/(<table[\s\S]*?<\/table>)/i)
    .filter((part) => part.trim())
    .flatMap((part) =>
      /^<table/i.test(part)
        ? gutenbergToPortableText(`<!-- wp:table --><figure class="wp-block-table">${part}</figure><!-- /wp:table -->`, options)
        : htmlToPortableText(part, options)
    )
  return blocks.length ? blocks : undefined
}

// Paragraph-preserving plain text (paragraphs separated by a blank line).
export function toPlainText(html) {
  if (!html) return undefined
  const text = sanitizeHtml(html.replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n'), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
  return text || undefined
}
