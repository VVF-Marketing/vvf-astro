// Contact form topics in the spec's order (7.14). The value is what a
// submission stores, in English whatever the page language; only the label
// (a global copy slot) is translated. `?topic=<value>` preselects one.
export const CONTACT_TOPICS = [
  { value: 'General inquiry', key: 'contactForm.topic.general' },
  { value: 'Donation support', key: 'contactForm.topic.donation' },
  { value: 'Child sponsorship', key: 'contactForm.topic.sponsorship' },
  { value: 'Media and press', key: 'contactForm.topic.media' },
  { value: 'Corporate partnership', key: 'contactForm.topic.corporate' },
  { value: 'Events', key: 'contactForm.topic.events' },
  { value: 'Volunteering', key: 'contactForm.topic.volunteering' },
  { value: 'Other', key: 'contactForm.topic.other' },
] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['value']

export function isContactTopic(value: string | null | undefined): value is ContactTopic {
  return CONTACT_TOPICS.some((t) => t.value === value)
}

// Link to Contact with a topic chosen: `/contact?topic=Child%20sponsorship`.
export function contactHref(topic: ContactTopic): string {
  return `/contact?topic=${encodeURIComponent(topic)}`
}
