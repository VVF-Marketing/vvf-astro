// Copy slots shared by every resource page (/resources/*, src/lib/copy.ts): the
// template's fixed text. Content specific to one item lives on the CMS item.
import { defineCopy } from '../../lib/copy'

export default defineCopy('/resources/*', {
  'button.aria-label': { label: 'Button: aria-label', default: 'Copy link to this page', maxLength: 40 },
  'button.text': { label: 'Button: text', default: 'Download the report (PDF)', maxLength: 40 },
  'p2.text': { label: 'P 2: text', default: 'Sponsor a child in Venezuela. Starting at $25 a month.', maxLength: 90 },
  'button2.text': { label: 'Button 2: text', default: 'Sponsor a child', maxLength: 30 },
  'h2.text': { label: 'H2: text', default: 'Related', maxLength: 20 },
  'seo.titleFallback': { label: 'Browser tab title when the resource has no SEO title ({title} is replaced)', default: '{title} | Victoria Venezuela Foundation', maxLength: 60 },
  lastUpdated: { label: 'Last updated line ({date} is replaced with the date)', default: 'Last updated {date}', maxLength: 40 },
  byPrefix: { label: 'Author line: word before the first author', default: 'By', maxLength: 10 },
  'share.copied': { label: 'Share button after copying (screen readers)', default: 'Link copied' },
  'share.failed': { label: 'Share button when copying fails (screen readers)', default: 'Copy failed — copy the address bar link instead' },
})
