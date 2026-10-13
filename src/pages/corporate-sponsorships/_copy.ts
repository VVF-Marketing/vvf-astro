// Copy slots for /corporate-sponsorships (src/lib/copy.ts). SEO defaults are the live site's
// values (src/data/page-seo.json, from the Webflow migration).
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/corporate-sponsorships', {
  ...seoSlots({
    title: 'Corporate Sponsorships | Victoria Venezuela Foundation',
    description: 'Partner with Victoria Venezuela Foundation. Sponsorship tiers from $250 to $2,500 a year, plus company matching, fund meals, medical care and school support for children in Venezuela.',
    image: '/images/pages/35e4610f-vvf-golf2025-memories-5-venezuelanflags-v1.jpg',
  }),
  'splitHero.heading': { label: 'Split hero: heading', default: 'Corporate Sponsorships', maxLength: 40 },
  'splitHero.subtext': { label: 'Split hero: text', default: 'Join the many organizations actively changing the lives of underprivileged children in Venezuela!', maxLength: 150 },
  'splitHero.label.1': { label: 'Split hero: button 1', default: 'Partner with Us', maxLength: 30 },
  'splitHero.imageAlt': { label: 'Split hero: image description', default: 'A girl smiling at a Victoria Venezuela Foundation event in Venezuela', maxLength: 110 },
  'sectionTitle.heading': { label: 'Section title: heading', default: 'Our Impact in Numbers', maxLength: 40 },
  'statIconCard.label': { label: 'Stat icon card: button', default: 'Nutrition Program', maxLength: 30 },
  'statIconCard.text': { label: 'Stat icon card: text', default: 'Meals served to children at risk', maxLength: 50 },
  'statIconCard2.label': { label: 'Stat icon card 2: button', default: 'Healthcare Program', maxLength: 30 },
  'statIconCard2.text': { label: 'Stat icon card 2: text', default: 'Medical visits for children', maxLength: 50 },
  'statIconCard3.label': { label: 'Stat icon card 3: button', default: 'Educational Program', maxLength: 30 },
  'statIconCard3.text': { label: 'Stat icon card 3: text', default: 'Children with educational support', maxLength: 50 },
  'statIconCard4.label': { label: 'Stat icon card 4: button', default: 'Corporate Sponsors', maxLength: 30 },
  'statIconCard4.text': { label: 'Stat icon card 4: text', default: 'Investing in programs to support children in Venezuela', maxLength: 90 },
  'sectionTitle2.heading': { label: 'Section title 2: heading', default: 'Sponsor packages', maxLength: 30 },
  'sectionTitle3.heading': { label: 'Section title 3: heading', default: 'Company Matching', maxLength: 30 },
  'sectionTitle3.text': { label: 'Section title 3: text', default: 'Company matching is a powerful incentive for employees to donate their own funds. It amplifies the impact for the nonprofit organization they choose to support, such as the Victoria Venezuela Foundation.', maxLength: 310 },
  'h2.text': { label: 'H2: text', default: 'Point of Contact', maxLength: 30 },
  'p.text': { label: 'P: text', default: 'Is your organization interested in investing in children and the future of Venezuela? Let’s make a positive impact together.', maxLength: 190 },
  'h22.text': { label: 'H2 2: text', default: 'Juan Tomasini', maxLength: 20 },
  'p2.text': { label: 'P 2: text', default: 'Vice President, Business Development', maxLength: 60 },
  'a.text': { label: 'A: text', default: 'donate@victoriavenezuelafoundation.org', maxLength: 60 },
  'a2.text': { label: 'A 2: text', default: 'www.victoriavenezuelafoundation.org', maxLength: 60 },
  'img.alt': { label: 'Img: image description', default: 'Benevity', maxLength: 20 },
  'img2.alt': { label: 'Img 2: image description', default: 'YourCause from Blackbaud', maxLength: 40 },
  'img3.alt': { label: 'Img 3: image description', default: 'GuideStar by Candid', maxLength: 30 },
})
