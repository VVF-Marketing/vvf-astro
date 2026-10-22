// /llms.txt (spec 2.4): a plain-text guide for answer engines and AI crawlers.
// Built from the site's content on each request, so upcoming events, the
// latest reports and the common questions stay current.
import type { EventItem, Faq, ResourceItem } from './content/types'

export const KEY_PAGES: { path: string; en: [string, string]; es: string }[] = [
  { path: '/', en: ['Home', 'What the foundation does: nutrition, medical care and education for children in Venezuela.'], es: 'Inicio' },
  { path: '/our-programs', en: ['Our Programs', 'The three programs and how they work together.'], es: 'Nuestros programas' },
  { path: '/sponsor-a-child', en: ['Sponsor a Child', 'How child sponsorship works ($25 a month, pooled gifts).'], es: 'Apadrina a un niño' },
  { path: '/children', en: ['Meet the Children', 'Children waiting for a sponsor, each with a profile.'], es: 'Conoce a los niños' },
  { path: '/ways-to-give', en: ['Ways to Give', 'One-time gifts, sponsorship, employer matching, donor-advised funds.'], es: 'Formas de ayudar' },
  { path: '/corporate-sponsorships', en: ['Corporate Sponsorships', 'Sponsorship tiers for companies and the employer matching search.'], es: 'Patrocinios corporativos' },
  { path: '/events-and-campaigns', en: ['Events & Campaigns', 'Current and past events and campaigns, including the annual golf tournament.'], es: 'Eventos y campañas' },
  { path: '/venezuela-earthquake-relief', en: ['Venezuela Earthquake Relief', 'The earthquake appeal and the support centre in La Guaira.'], es: 'Ayuda por el terremoto en Venezuela' },
  { path: '/our-team', en: ['Our Team', 'Board of directors and staff.'], es: 'Nuestro equipo' },
  { path: '/financials-and-transparency', en: ['Financials & Transparency', 'Annual and quarterly reports, Candid seal, IRS determination letter.'], es: 'Finanzas y transparencia' },
  { path: '/resources', en: ['Resources', 'Stories, news and financial reports.'], es: 'Recursos' },
  { path: '/contact', en: ['Contact', 'Contact form, email and phone.'], es: 'Contacto' },
]

export interface LlmsInput {
  site: string
  upcoming: Pick<EventItem, 'slug' | 'title' | 'startDate' | 'location' | 'summary'>[]
  reports: Pick<ResourceItem, 'slug' | 'title' | 'publishedAt' | 'external' | 'externalUrl'>[]
  faqs: Pick<Faq, 'question' | 'answer'>[]
}

const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : undefined)
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

export function buildLlmsTxt({ site, upcoming, reports, faqs }: LlmsInput): string {
  const url = (path: string) => `${site}${path}`
  const lines = [
    '# Victoria Venezuela Foundation',
    '',
    '> A 501(c)(3) nonprofit in Weston, Florida (EIN 88-3282100) providing nutrition, medical care and education to children in Venezuela. Sponsorship starts at $25 a month. The site is in English and in Spanish (under /es).',
    '',
    '## Key pages',
    '',
    ...KEY_PAGES.map((p) => `- [${p.en[0]}](${url(p.path)}): ${p.en[1]}`),
  ]
  if (upcoming.length) {
    lines.push('', '## Upcoming events', '')
    for (const e of upcoming) {
      const where = e.location ? `, ${e.location}` : ''
      lines.push(`- [${e.title}](${url(`/events/${e.slug}`)}): ${day(e.startDate)}${where}.${e.summary ? ` ${oneLine(e.summary)}` : ''}`)
    }
  }
  if (reports.length) {
    lines.push('', '## Latest reports', '')
    for (const r of reports) {
      // An external report has no page here: link where it's published.
      const href = r.external && r.externalUrl ? r.externalUrl : url(`/resources/${r.slug}`)
      lines.push(`- [${r.title}](${href})${r.publishedAt ? `: ${day(r.publishedAt)}` : ''}`)
    }
  }
  if (faqs.length) {
    lines.push('', '## Common questions', '')
    for (const f of faqs) lines.push(`- **${oneLine(f.question)}** ${oneLine(f.answer)}`)
  }
  lines.push(
    '',
    '## Spanish',
    '',
    'The key pages exist in Spanish under /es, with the same path. Events and articles can have a different address in Spanish; each page links its other language.',
    '',
    ...KEY_PAGES.map((p) => `- [${p.es}](${url(p.path === '/' ? '/es' : `/es${p.path}`)})`),
    ''
  )
  return lines.join('\n')
}
