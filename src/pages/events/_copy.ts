// Copy slots for /events (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/events', {
  ...seoSlots({
    title: 'Events | Victoria Venezuela Foundation',
    description: 'Events and campaigns from Victoria Venezuela Foundation, including our annual charity golf tournament in Weston, FL, supporting children in Venezuela.',
    image: '/images/pages/57692375-vvf-home-shareimage-v2.jpg',
  }),
  'hero.imageAlt': { label: 'Hero: image description', default: 'A golfer hugging a young boy on the course at the charity golf tournament.', maxLength: 120 },
  'hero.heading': { label: 'Hero: heading', default: 'Events & Campaigns', maxLength: 30 },
  'hero.subtext': { label: 'Hero: text', default: 'Join our community and make an impact. Together we gather to support those in need across Venezuela.', maxLength: 150 },
  'hero.label.1': { label: 'Hero: button 1', default: 'Upcoming Events', maxLength: 30 },
  'eyebrow.text': { label: 'Eyebrow: text', default: 'Upcoming', maxLength: 20 },
  'sectionTitle.tagline': { label: 'Section title: tagline', default: 'Archive', maxLength: 20 },
  'sectionTitle.heading': { label: 'Section title: heading', default: 'Past', maxLength: 20 },
  'sectionTitle.text': { label: 'Section title: text', default: 'Gatherings that changed lives and raised hope', maxLength: 70 },
  'eventCard2.ctaLabel': { label: 'Event card 2: button', default: 'See the recap', maxLength: 20 },
  'newsletterSignup.heading': { label: 'Newsletter signup: heading', default: 'Never miss an event', maxLength: 30 },
  'newsletterSignup.text': { label: 'Newsletter signup: text', default: 'Get invitations and updates delivered to your inbox', maxLength: 80 },
})
