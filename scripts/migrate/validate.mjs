// Cross-checks the scraped snapshot against the Webflow Data API dump
// (snapshot/api/, written by extract.mjs when WEBFLOW_API_TOKEN is set):
// item counts, slug sets and key field values per collection. Children are
// reported as mismatch counts only — never values (public repo).
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { SNAPSHOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'

const read = (rel) => JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, rel), 'utf8'))
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const text = (html) => norm((html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'))
const isoDay = (s) => (s ? new Date(s).toISOString().slice(0, 10) : undefined)
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const liveDay = (t) => {
  const m = (t ?? '').match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/)
  return m ? new Date(Date.UTC(+m[3], MONTHS.indexOf(m[1].toLowerCase()), +m[2])).toISOString().slice(0, 10) : undefined
}
const option = (schema, field, id) => schema.fields.find((f) => f.slug === field)?.validations?.options?.find((o) => o.id === id)?.name

// Field comparisons: [label, api value, scraped value]
const CHECKS = {
  'team-members': {
    scraped: () => Object.entries(read('team_members.json').members).map(([slug, m]) => ({ slug, ...m })),
    fields: (f, s) => [
      ['name', norm(f.name), norm(s.name)],
      ['quote', norm(f.quote), norm(s.quote)],
      ['since', norm(f.since), norm(s.since)],
      ['from', norm(f.from), norm(s.from)],
      ['based-in', norm(f['based-in']), norm(s.basedIn)],
      ['bio-summary', norm(f['bio-summary']), norm(s.lead)],
      ['bio-full', text(f['bio-full']), text(s.bodyHtml)],
    ],
  },
  children: {
    private: true,
    scraped: () => read('children.json').items,
    fields: (f, s, schema) => [
      ['name', norm(f.name), norm(s.displayName)],
      ['age', f.age, s.age],
      ['date-of-birth', isoDay(f['date-of-birth']), liveDay(s.birthday)],
      ['dream', norm(f['dream-aspiration']), norm(s.dream)],
      ['gender', option(schema, 'gender', f.gender) ?? f.sex, s.gender],
      ['story', text(f.story), text(s.aboutHtml)],
    ],
  },
  events: {
    scraped: () => read('events.json'),
    fields: (f, s) => [['event-date', isoDay(f['event-date']), liveDay(s.dateText ?? s.card?.date)]],
  },
  resources: {
    scraped: () => read('resources.json'),
    fields: (f, s) => [
      ['publish-date', isoDay(f['publish-date']), liveDay(s.card?.date)],
      ['last-updated', isoDay(f['last-updated']), liveDay(s.updated)],
      ['meta-description', norm(f['meta-description']), norm(s.seo?.description)],
      ['body', text(f.body), text(s.bodyHtml)],
    ],
  },
}

// Collections compared by count only (the scrape reads them off pages).
const COUNTS = {
  partners: () => read('partners.json').length,
  'event-offers': () => read('events.json').reduce((n, e) => n + e.offers.length, 0),
  'benefit-rows': () => read('events.json').reduce((n, e) => n + e.benefitRows.length, 0),
}

export function validate() {
  const report = createSection('API validation')
  if (!existsSync(path.join(SNAPSHOT_DIR, 'api'))) {
    report.line('- Skipped: no `snapshot/api/` dump. Set `WEBFLOW_API_TOKEN` and `WEBFLOW_SITE_ID`, then run `npm run migrate:extract`.')
    report.write()
    return { skipped: true }
  }
  let problems = 0
  report.line(`Run: ${new Date().toISOString()}`)
  report.line()
  report.line('| Collection | API items | Scraped | Slug differences | Field mismatches |')
  report.line('| --- | --- | --- | --- | --- |')
  for (const [name, check] of Object.entries(CHECKS)) {
    const { schema, items } = read(`api/${name}.json`)
    const scraped = check.scraped()
    const bySlug = new Map(scraped.map((s) => [s.slug, s]))
    const apiSlugs = new Set(items.map((i) => i.fieldData.slug))
    const missing = items.filter((i) => !bySlug.has(i.fieldData.slug)).length + scraped.filter((s) => !apiSlugs.has(s.slug)).length
    const mismatches = {}
    for (const item of items) {
      const s = bySlug.get(item.fieldData.slug)
      if (!s) continue
      for (const [label, a, b] of check.fields(item.fieldData, s, schema)) {
        if ((a ?? '') !== (b ?? '')) mismatches[label] = (mismatches[label] ?? 0) + 1
      }
    }
    const fieldSummary = Object.entries(mismatches).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'
    problems += missing + Object.values(mismatches).reduce((a, b) => a + b, 0)
    report.line(`| ${name} | ${items.length} | ${scraped.length} | ${missing} | ${fieldSummary} |`)
  }
  for (const [name, count] of Object.entries(COUNTS)) {
    const apiCount = read(`api/${name}.json`).items.length
    const scraped = count()
    if (apiCount !== scraped) problems++
    report.line(`| ${name} | ${apiCount} | ${scraped} | – | count ${apiCount === scraped ? 'matches' : 'differs'} |`)
  }
  report.line()
  report.line(problems ? `- ${problems} differences — review before seeding.` : '- Scraped snapshot matches the Webflow API.')
  report.line('- Children are compared by count only; no child values are written here.')
  report.line('- CMS SEO titles exclude the " | Victoria Venezuela Foundation" suffix the live template adds; the snapshot keeps the rendered titles.')
  report.write()
  return { problems }
}
