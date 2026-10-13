// Finds visible copy written as a literal in an .astro page instead of coming
// from a copy slot (src/lib/copy.ts). Used by copyLint.test.ts over every
// static page so new hardcoded text fails CI.

const COPY_ATTRS = [
  'alt', 'aria-label', 'title', 'placeholder', 'heading', 'subtext', 'text', 'tagline', 'body', 'eyebrow',
  'imageAlt', 'caption', 'description', 'label', 'ctaLabel', 'cardsLabel', 'quote', 'subheading', 'note',
]
const COPY_KEYS = ['label', 'caption', 'title', 'body', 'heading', 'text', 'eyebrow', 'description', 'question', 'answer', 'quote', 'imageAlt', 'alt', 'note', 'subtext', 'tagline']

export interface LiteralCopy {
  line: number
  text: string
}

// Blanks out the inside of every tag (`<Hero heading={x} ...>`), keeping
// offsets, so attribute names aren't mistaken for text. Braces are tracked so
// `=>` or `>` inside an attribute expression doesn't end the tag.
function maskTagInteriors(template: string): string {
  const out = template.split('')
  let i = 0
  while (i < out.length) {
    if (out[i] === '<' && /[A-Za-z/!]/.test(out[i + 1] ?? '')) {
      let depth = 0
      let j = i + 1
      for (; j < out.length; j++) {
        const c = out[j]
        if (c === '{') depth++
        else if (c === '}') depth--
        else if (c === '>' && depth === 0) break
        if (c !== '\n') out[j] = ' '
      }
      i = j + 1
    } else i++
  }
  return out.join('')
}

const JS_RUN = /&&|\|\||=>|^\s*[)?:,;]|[(?:]\s*$/

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

export function findLiteralCopy(source: string): LiteralCopy[] {
  const fmEnd = source.startsWith('---') ? source.indexOf('\n---', 3) + 4 : 0
  // Blank out scripts and styles (keeping offsets) — code, not copy.
  const masked = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, (m) => m.replace(/[^\n]/g, ' '))
  const template = masked.slice(fmEnd)
  const textOnly = maskTagInteriors(template)
  const found: LiteralCopy[] = []
  const add = (index: number, text: string) => found.push({ line: lineOf(masked, index), text: text.trim() })

  // Text runs between tags and/or expressions, e.g. `<p>Last updated {date}</p>`.
  for (const m of textOnly.matchAll(/(?<=[>}])([^<>{}]*[A-Za-z][^<>{}]*)(?=[<{])/g)) {
    if (JS_RUN.test(m[1])) continue // code between expressions, not text
    add(fmEnd + m.index!, m[1])
  }
  for (const m of template.matchAll(new RegExp(`\\s(?:${COPY_ATTRS.join('|')})="([^"{}]*[A-Za-z][^"{}]*)"`, 'g'))) add(fmEnd + m.index!, m[1])
  const keyed = new RegExp(`\\b(?:${COPY_KEYS.join('|')}):\\s*(?:'([^'\\n]*[A-Za-z][^'\\n]*)'|"([^"\\n]*[A-Za-z][^"\\n]*)")`, 'g')
  for (const m of masked.matchAll(keyed)) add(m.index!, m[1] ?? m[2])
  return found.sort((a, b) => a.line - b.line)
}
