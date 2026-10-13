// Copy slots for /financials-and-transparency (src/lib/copy.ts). Defaults are
// the live page's English text.
import { defineCopy, seoSlots } from '../../lib/copy'

export default defineCopy('/financials-and-transparency', {
  ...seoSlots({
    title: 'Financials & Transparency | Victoria Venezuela Foundation',
    description:
      'Our annual and quarterly impact reports, Candid Platinum Seal of Transparency and IRS registration. Victoria Venezuela Foundation is a 501(c)(3), Tax ID 88-3282100.',
    image: '/images/pages/financials-hero.webp',
  }),
  'hero.heading': { label: 'Hero: heading', default: 'Financials & Transparency', maxLength: 50 },
  'hero.subtext': {
    label: 'Hero: text',
    default: 'We believe in complete accountability to our donors. Every dollar matters, and you deserve to know exactly how your gift changes lives in Venezuela.',
    maxLength: 220,
  },
  'hero.imageAlt': { label: 'Hero: image description', default: 'Young girl focused on writing in a notebook at a blue desk in a classroom with other children.', maxLength: 150 },
  'hero.cta': { label: 'Hero: button', default: 'Donate', maxLength: 30 },
  'confidence.tagline': { label: 'Give with Confidence: tagline', default: 'Give with Confidence', maxLength: 40 },
  'confidence.heading': { label: 'Give with Confidence: heading', default: 'Independently reviewed for transparency', maxLength: 70 },
  'confidence.text': {
    label: 'Give with Confidence: text',
    default: 'Candid reviews how openly US nonprofits share their goals, finances and results. Platinum is the highest level of its Seal of Transparency.',
    maxLength: 220,
  },
  'confidence.point1.title': { label: 'Give with Confidence: first point title', default: 'Candid Platinum Seal of Transparency', maxLength: 60 },
  'confidence.point1.text': { label: 'Give with Confidence: first point text', default: 'Awarded four years in a row, 2023 to 2026.', maxLength: 120 },
  'confidence.point2.title': { label: 'Give with Confidence: second point title', default: 'Registered 501(c)(3) charity', maxLength: 60 },
  'confidence.point2.text': { label: 'Give with Confidence: second point text', default: 'Tax ID 88-3282100. Our record is public with the IRS.', maxLength: 120 },
  'confidence.candidLink': { label: 'Give with Confidence: Candid profile link', default: 'Our Candid profile', maxLength: 40 },
  'confidence.irsLink': { label: 'Give with Confidence: IRS letter link', default: 'Our IRS determination letter', maxLength: 40 },
  'confidence.imageAlt': {
    label: 'Give with Confidence: image description',
    default: 'A smiling boy at a table with a meal. Overlay: 4 Years of Excellence, Candid Platinum Seal of Transparency for the fourth year in a row.',
    maxLength: 200,
  },
  'allocation.tagline': { label: 'Where your donation goes: tagline', default: 'Allocation', maxLength: 30 },
  'allocation.heading': { label: 'Where your donation goes: heading', default: 'Where your donation goes', maxLength: 60 },
  'allocation.text': {
    label: 'Where your donation goes: text',
    default: 'We keep administration costs at zero, so your gift goes to the work in Venezuela and the events that fund it.',
    maxLength: 200,
  },
  'allocation.cta': { label: 'Where your donation goes: button', default: 'Read the 2025 report', maxLength: 40 },
  'allocation.imageAlt': { label: 'Where your donation goes: image description', default: '', maxLength: 150 },
  'annual.tagline': { label: 'Annual reports: tagline', default: 'Reports', maxLength: 30 },
  'annual.heading': { label: 'Annual reports: heading', default: 'Annual reports', maxLength: 50 },
  'annual.text': {
    label: 'Annual reports: text',
    default: 'Each year we publish a report on our programs and our finances. Read it on the site or download the PDF.',
    maxLength: 200,
  },
  'quarterly.tagline': { label: 'Quarterly reports: tagline', default: 'Updates', maxLength: 30 },
  'quarterly.heading': { label: 'Quarterly reports: heading', default: 'Quarterly impact reports', maxLength: 60 },
  'quarterly.text': {
    label: 'Quarterly reports: text',
    default: 'Between annual reports, we share short quarterly updates on meals, medical visits and school support.',
    maxLength: 200,
  },
  'board.tagline': { label: 'Board: tagline', default: 'Leadership', maxLength: 30 },
  'board.heading': { label: 'Board: heading', default: 'Our board oversees the foundation', maxLength: 60 },
  'board.text': {
    label: 'Board: text',
    default: "Our board of directors oversees the foundation's finances and direction. You can meet each member on our team page.",
    maxLength: 200,
  },
  'board.member.1': { label: 'Board: first member line', default: 'Randy Lander, Founder and Chairman', maxLength: 70 },
  'board.member.2': { label: 'Board: second member line', default: 'Helen Bello, Co-Founder, CFO and Vice Chair', maxLength: 70 },
  'board.member.3': { label: 'Board: third member line', default: 'Pastor Jose Guerrero, Board Member', maxLength: 70 },
  'board.cta': { label: 'Board: button', default: 'Meet the Board', maxLength: 30 },
  'contact.heading': { label: 'Contact box: heading', default: 'Still have questions for us?', maxLength: 60 },
  'contact.text': { label: 'Contact box: text', default: 'Ask us about our reports, our finances or how your gift is used.', maxLength: 160 },
  'contact.cta': { label: 'Contact box: button', default: 'Contact', maxLength: 30 },
})
