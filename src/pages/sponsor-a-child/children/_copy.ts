// Copy slots for /sponsor-a-child/children (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../../lib/copy'

export default defineCopy('/sponsor-a-child/children', {
  ...seoSlots({
    title: 'Meet the Children | Victoria Venezuela Foundation',
    description: 'Meet children in Venezuela who are waiting for a sponsor. Sponsorship starts at $25 a month and covers meals, medical care and school.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),
  'sectionTitle.tagline': { label: 'Section title: tagline', default: 'Children', maxLength: 20 },
  'sectionTitle.heading': { label: 'Section title: heading', default: 'Meet the children', maxLength: 30 },
  'sectionTitle.text': { label: 'Section title: text', default: 'Sponsorship starts at $25 a month and covers meals, medical care and school. Find the child who needs you most.', maxLength: 170 },
  'label.text': { label: 'Label: text', default: 'Search by name', maxLength: 30 },
  'input.placeholder': { label: 'Input: placeholder', default: 'Search by name', maxLength: 30 },
  'legend.text': { label: 'Legend: text', default: 'Age range', maxLength: 20 },
  'p.text': { label: 'P: text', default: 'No children match your filters.', maxLength: 50 },

})
