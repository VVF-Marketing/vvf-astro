// Copy slots for /contact (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/contact', {
  ...seoSlots({
    title: 'Contact Us | Victoria Venezuela Foundation',
    description: 'Questions about sponsoring a child, donating or partnering with us? Send Victoria Venezuela Foundation a message and our team will reply.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),
  'hero.imageAlt': { label: 'Hero: image description', default: 'A young girl holding cotton candy at a Victoria Venezuela Foundation event.', maxLength: 120 },
  'hero.heading': { label: 'Hero: heading', default: 'Contact us', maxLength: 20 },
  'hero.subtext': { label: 'Hero: text', default: "We'd love to hear from you. Reach out with questions, partnership opportunities, or to learn how you can make a difference in Venezuela.", maxLength: 210 },
  'hero.label.1': { label: 'Hero: button 1', default: 'Donate', maxLength: 20 },
  'p2.text': { label: 'P 2: text', default: 'Get in touch', maxLength: 20 },
  'h22.text': { label: 'H2 2: text', default: 'Send us a message', maxLength: 30 },
  'p3.text': { label: 'P 3: text', default: "Tell us your name, email, and how we can help you serve Venezuela's most vulnerable families.", maxLength: 140 },
  'contact.address': { label: 'Contact details: mailing address', default: 'P.O. Box 327222, Weston, FL 33332', maxLength: 80 },
})
