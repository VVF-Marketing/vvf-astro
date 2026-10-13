import ImpactBanner from './ImpactBanner.astro'

export default {
  title: 'Molecules/ImpactBanner',
  component: ImpactBanner,
}

// Live home page "Connection" section.
export const Default = {
  args: {
    eyebrow: 'Connection',
    heading: 'Build a bond that matters',
    body: "When you sponsor a child, you're not sending money into the void. You're meeting someone. You're writing letters, receiving updates, watching a real person grow. This is personal. This is lasting.",
    bullets: [
      'Monthly sponsorship covers nutrition, medical care, and education',
      'Direct correspondence and photos from your sponsored child',
      'Transparent reporting on how your support makes a difference',
    ],
    imageUrl: '/images/pages/d9d1e4da-8006bc582f67d04432c0e2c17b85765bf066fbaa.jpg',
    imageAlt: 'Smiling boy holding cotton candy with children playing near an inflatable bounce house outdoors.',
    cta: { label: 'Meet The Children', href: '/sponsor-a-child/children' },
  },
}

export const WithSecondaryAction = {
  args: {
    eyebrow: 'Global',
    heading: 'Our work aligns with global development goals',
    body: 'Our programs directly support the United Nations Sustainable Development Goals.',
    bullets: ['Zero hunger for all children', 'Good health and well being', 'Quality education for every child'],
    cta: { label: 'Learn more', href: '/resources' },
    secondaryCta: { label: 'Explore', href: '/our-programs' },
  },
}
