// llms.txt (spec 2.4): a short plain-text guide for AI crawlers, with links
// to the key pages at their current paths.
import type { APIRoute } from 'astro'
import { SITE_URL } from '../lib/site.mjs'

export const prerender = false

const PAGES: [string, string, string][] = [
  ['/', 'Home', 'What the foundation does: nutrition, medical care and education for children in Venezuela.'],
  ['/our-programs', 'Our Programs', 'The three programs and how they work together.'],
  ['/sponsor-a-child', 'Sponsor a Child', 'How child sponsorship works ($25 a month, pooled gifts).'],
  ['/children', 'Meet the Children', 'Children waiting for a sponsor, each with a profile.'],
  ['/ways-to-give', 'Ways to Give', 'One-time gifts, sponsorship, employer matching, donor-advised funds.'],
  ['/corporate-sponsorships', 'Corporate Sponsorships', 'Sponsorship tiers for companies and the employer matching search.'],
  ['/events-and-campaigns', 'Events & Campaigns', 'Current and past events and campaigns, including the annual golf tournament.'],
  ['/venezuela-earthquake-relief', 'Venezuela Earthquake Relief', 'The earthquake appeal and the support centre in La Guaira.'],
  ['/our-team', 'Our Team', 'Board of directors and staff.'],
  ['/financials-and-transparency', 'Financials & Transparency', 'Annual and quarterly reports, Candid seal, IRS determination letter.'],
  ['/resources', 'Resources', 'Stories, news and financial reports.'],
  ['/contact', 'Contact', 'Contact form, email and phone.'],
]

export const GET: APIRoute = () => {
  const lines = [
    '# Victoria Venezuela Foundation',
    '',
    '> A 501(c)(3) nonprofit in Weston, Florida (EIN 88-3282100) providing nutrition, medical care and education to children in Venezuela. The site is in English and in Spanish (under /es).',
    '',
    '## Key pages',
    '',
    ...PAGES.map(([path, name, about]) => `- [${name}](${SITE_URL}${path === '/' ? '/' : path}): ${about}`),
    '',
    '## Spanish',
    '',
    `- [Fundación Victoria Venezuela](${SITE_URL}/es): every page above exists in Spanish under /es with the same path.`,
    '',
  ]
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
