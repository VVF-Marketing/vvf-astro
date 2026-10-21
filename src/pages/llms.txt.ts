// llms.txt (spec 2.4): a plain-text guide for AI crawlers and answer engines,
// built from the site's content (src/lib/llms.ts).
import type { APIRoute } from 'astro'
import { SITE_URL } from '../lib/site.mjs'
import { buildLlmsTxt } from '../lib/llms'
import { getEvents, getFaqs, getReports, isUpcoming } from '../lib/content'

export const prerender = false

export const GET: APIRoute = async () => {
  const [events, annual, quarterly, sponsorship, donation] = await Promise.all([
    getEvents(),
    getReports('annual'),
    getReports('quarterly'),
    getFaqs('sponsorship'),
    getFaqs('donation'),
  ])
  const text = buildLlmsTxt({
    site: SITE_URL,
    upcoming: events.filter(isUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    reports: [...annual.slice(0, 2), ...quarterly.slice(0, 2)],
    faqs: [...sponsorship.slice(0, 4), ...donation.slice(0, 3)],
  })
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
