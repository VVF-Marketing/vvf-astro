// Copy slots shared by the three thank-you pages (spec 7.17): one layout,
// different copy. Defaults are the live English pages' text.
import { defineCopy, seoSlots } from './copy'

interface ThankYouDefaults {
  description: string
  subtext: string
  tagline: string
  heading: string
  items: [string, string][]
}

export function thankYouCopy(route: string, d: ThankYouDefaults) {
  const item = (n: number) => ({
    [`checklist.item.${n}.title`]: { label: `Checklist ${n}: title`, default: d.items[n - 1][0], maxLength: 60 },
    [`checklist.item.${n}.text`]: { label: `Checklist ${n}: text`, default: d.items[n - 1][1], maxLength: 120 },
  })
  return defineCopy(route, {
    ...seoSlots({ title: 'Thank you | Victoria Venezuela Foundation', description: d.description }),
    'hero.imageAlt': { label: 'Hero: image description', default: 'Smiling girl sitting at a table eating empanadas with orange cups nearby.', maxLength: 120 },
    'hero.heading': { label: 'Hero: heading', default: 'Thank you for believing in children', maxLength: 60 },
    'hero.subtext': { label: 'Hero: text', default: d.subtext, maxLength: 120 },
    'hero.label.1': { label: 'Hero: button', default: 'Back to home', maxLength: 30 },
    'checklist.tagline': { label: 'Checklist: tagline', default: d.tagline, maxLength: 40 },
    'checklist.heading': { label: 'Checklist: heading', default: d.heading, maxLength: 60 },
    ...item(1),
    ...item(2),
    ...item(3),
    ...item(4),
    'next.heading': { label: 'What happens next: heading', default: 'What happens next', maxLength: 40 },
    'next.text': {
      label: 'What happens next: text',
      default:
        'Check your email for your receipt and next steps. Questions? Call +1 (954) 371-0557 or send us a message. Victoria Venezuela Foundation is a 501(c)(3) nonprofit, Tax ID 88-3282100.',
      maxLength: 300,
    },
    'next.label.1': { label: 'What happens next: button 1', default: 'Contact us', maxLength: 30 },
    'next.label.2': { label: 'What happens next: button 2', default: 'Back to home', maxLength: 30 },
    'image.alt': { label: 'Closing image: description', default: 'Three smiling girls playing on an inflatable slide at a foundation activity', maxLength: 120 },
  })
}

export type ThankYouManifest = ReturnType<typeof thankYouCopy>
