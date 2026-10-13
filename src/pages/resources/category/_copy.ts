// Copy slots for the resource category pages (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../../lib/copy'

export default [
  defineCopy('/resources/category/stories', {
    ...seoSlots({
      title: 'Stories | Resources | Victoria Venezuela Foundation',
      description: 'Stories from our nutrition, medical care and education programs for children in Venezuela.',
      image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
    }),
  }),
  defineCopy('/resources/category/financials-transparency', {
    ...seoSlots({
      title: 'Financials & Transparency | Resources | Victoria Venezuela Foundation',
      description: 'Our annual and quarterly impact reports, with condensed financials. Victoria Venezuela Foundation is a 501(c)(3), EIN 88-3282100.',
      image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
    }),
  }),
]
