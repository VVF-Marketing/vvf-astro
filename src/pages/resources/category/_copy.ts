// Copy slots for the resource category pages (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../../lib/copy'

// Title from the category's name (spec 7.12); the description is the
// category's own, these defaults stand in when it has none.
const titleTemplate = { label: 'SEO title ({name} is the category name)', default: '{name} | Resources | Victoria Venezuela Foundation', maxLength: 70 }

export default [
  defineCopy('/resources/stories', {
    ...seoSlots({
      title: 'Stories | Resources | Victoria Venezuela Foundation',
      description: 'Stories from our nutrition, medical care and education programs for children in Venezuela.',
      image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
    }),
    'seo.titleTemplate': titleTemplate,
  }),
  defineCopy('/resources/financials', {
    ...seoSlots({
      title: 'Financial Reports | Resources | Victoria Venezuela Foundation',
      description: 'Our annual and quarterly impact reports, with condensed financials. Victoria Venezuela Foundation is a 501(c)(3), EIN 88-3282100.',
      image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
    }),
    'seo.titleTemplate': titleTemplate,
  }),
]
