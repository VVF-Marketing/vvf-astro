// Small readers for Portable Text stored by EmDash, for components that
// render structured lists (event program, "includes") rather than prose.
import type { PortableTextBlock } from './content/types'

interface Span {
  _type: string
  text?: string
  marks?: string[]
}

function spans(block: PortableTextBlock): Span[] {
  return Array.isArray(block.children) ? (block.children as Span[]) : []
}

// Plain text of every list item, in order.
export function listItemTexts(blocks: PortableTextBlock[] | undefined): string[] {
  return (blocks ?? [])
    .filter((b) => b._type === 'block' && b.listItem)
    .map((b) => spans(b).map((s) => s.text ?? '').join('').trim())
    .filter(Boolean)
}

// List items split into their bold lead-in and the remaining text, e.g.
// "<strong>8:00 AM</strong> Registration" → { lead: '8:00 AM', text: 'Registration' }.
export function listItemsWithLead(blocks: PortableTextBlock[] | undefined): { lead?: string; text: string }[] {
  return (blocks ?? [])
    .filter((b) => b._type === 'block' && b.listItem)
    .map((b) => {
      const all = spans(b)
      const lead = all.filter((s) => s.marks?.includes('strong')).map((s) => s.text ?? '').join('').trim()
      const text = all.filter((s) => !s.marks?.includes('strong')).map((s) => s.text ?? '').join('').trim()
      return { lead: lead || undefined, text }
    })
    .filter((i) => i.text || i.lead)
}
