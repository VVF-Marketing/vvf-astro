// Copy slots for /privacy-policy (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../lib/copy'
import type { PortableTextBlock } from '../../lib/content/types'
import body from './_body.json'

export default defineCopy('/privacy-policy', {
  ...seoSlots({
    title: 'Privacy Policy | Victoria Venezuela Foundation',
    description: 'How Victoria Venezuela Foundation collects, uses, stores and protects information from donors, volunteers, partners and website visitors.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),
  body: { label: 'Policy text', format: 'rich', default: body as PortableTextBlock[] },
  'p.text': { label: 'P: text', default: 'Effective date: July 6th, 2026', maxLength: 50 },
  'h1.text': { label: 'H1: text', default: 'Privacy Policy', maxLength: 30 },
})
