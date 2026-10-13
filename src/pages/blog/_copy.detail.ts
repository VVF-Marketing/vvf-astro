// Copy slots shared by every blog post page (/blog/*, src/lib/copy.ts): the
// template's fixed text. Content specific to one item lives on the CMS item.
import { defineCopy } from '../../lib/copy'

export default defineCopy('/blog/*', {
  'breadcrumbs.label.1': { label: 'Breadcrumbs: button 1', default: 'Blog', maxLength: 20 },
  'p4.text': { label: 'P 4: text', default: 'Full article body pending final copy from the foundation.', maxLength: 90 },
  'h2.text': { label: 'H2: text', default: 'Featured', maxLength: 20 },
  'seo.titleFallback': { label: 'Browser tab title ({title} is replaced with the post title)', default: '{title} | Victoria Venezuela Foundation', maxLength: 60 },
  breadcrumb: { label: 'Breadcrumb: blog link', default: 'Blog', maxLength: 20 },
  lastUpdated: { label: 'Last updated line ({date} is replaced with the date)', default: 'Last updated {date}', maxLength: 40 },
  byAuthor: { label: 'Author line ({name} is replaced with the author)', default: 'By {name}', maxLength: 30 },
})
