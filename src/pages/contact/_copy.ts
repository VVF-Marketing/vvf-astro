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
  'hero.label.2': { label: 'Hero: button 2', default: 'Get Involved', maxLength: 20 },
  'sectionTitle.tagline': { label: 'Section title: tagline', default: 'Ways to connect', maxLength: 30 },
  'sectionTitle.heading': { label: 'Section title: heading', default: 'Multiple ways to reach us', maxLength: 40 },
  'sectionTitle.text': { label: 'Section title: text', default: 'Choose the best way to connect based on your needs.', maxLength: 80 },
  'p2.text': { label: 'P 2: text', default: 'Get in touch', maxLength: 20 },
  'h22.text': { label: 'H2 2: text', default: 'Send us a message', maxLength: 30 },
  'p3.text': { label: 'P 3: text', default: "Tell us your name, email, and how we can help you serve Venezuela's most vulnerable families.", maxLength: 140 },
  'reachUs.general.title': { label: 'Reach-us card (General inquiries): title', default: 'General inquiries', maxLength: 40 },
  'reachUs.general.body': { label: 'Reach-us card (General inquiries): text', default: 'Questions about our mission, programs, or how we serve Venezuela.', maxLength: 220 },
  'reachUs.donation.title': { label: 'Reach-us card (Donation support): title', default: 'Donation support', maxLength: 40 },
  'reachUs.donation.body': { label: 'Reach-us card (Donation support): text', default: 'Questions about giving, sponsorship, or making an impact. Our team is ready to help you find the right option.', maxLength: 220 },
  'reachUs.media.title': { label: 'Reach-us card (Media and press): title', default: 'Media and press', maxLength: 40 },
  'reachUs.media.body': { label: 'Reach-us card (Media and press): text', default: 'Journalists, bloggers, and media outlets seeking interviews, stories, or resources about our work in Venezuela.', maxLength: 220 },
  'reachUs.corporate.title': { label: 'Reach-us card (Corporate partnerships): title', default: 'Corporate partnerships', maxLength: 40 },
  'reachUs.corporate.body': { label: 'Reach-us card (Corporate partnerships): text', default: 'Companies that want to sponsor a program, match employee gifts, or bring their team on a mission trip. See the packages and get in touch.', maxLength: 220 },
  'contact.address': { label: 'Contact details: mailing address', default: 'P.O. Box 327222, Weston, FL 33332', maxLength: 80 },
})
