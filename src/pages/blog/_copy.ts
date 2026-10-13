// Copy slots for /blog (src/lib/copy.ts). Project-only page (no live
// counterpart); SEO defaults are what the page output before slots existed.
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/blog', {
  ...seoSlots({
    title: 'Blog | Victoria Venezuela Foundation',
    description: 'Victoria Venezuela Foundation provides nutrition, medical care and education to children in Venezuela.',
  }),
  heading: { label: 'Page heading', default: 'Blog', maxLength: 40 },
  'filter.all': { label: 'Category filter: all posts', default: 'View all', maxLength: 20 },
  'filter.Stories': { label: 'Category filter: Stories', default: 'Stories', maxLength: 20 },
  'filter.Events': { label: 'Category filter: Events', default: 'Events', maxLength: 20 },
  'filter.Financials': { label: 'Category filter: Financials', default: 'Financials', maxLength: 20 },
  'filter.News': { label: 'Category filter: News', default: 'News', maxLength: 20 },
  resultCount: {
    label: 'Result count ({visible} and {total} are replaced with numbers)',
    default: 'Showing {visible} of {total}',
    maxLength: 40,
  },
  featured: { label: 'Sidebar: featured heading', default: 'Featured', maxLength: 30 },
})
