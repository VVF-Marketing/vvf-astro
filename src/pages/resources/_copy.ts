// Copy slots for /resources (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/resources', {
  ...seoSlots({
    title: 'Resources | Victoria Venezuela Foundation',
    description: 'Stories, news, events and financial reports from Victoria Venezuela Foundation, a 501(c)(3) supporting children in Venezuela.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),

})
