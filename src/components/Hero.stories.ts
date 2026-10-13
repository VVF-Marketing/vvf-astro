import Hero from './Hero.astro'

export default {
  title: 'Organisms/Hero',
  component: Hero,
}

export const Default = {
  args: {
    imageUrl: '/images/og-default.jpg',
    heading: 'Transform a child’s life in Venezuela',
    subtext: 'Every child deserves nutrition, medical care, and education.',
    primaryCta: { label: 'Sponsor a Child', href: '/sponsor-a-child' },
    secondaryCta: { label: 'Ways to Give', href: '/ways-to-give' },
  },
}

export const CardRight = {
  args: {
    imageUrl: '/images/og-default.jpg',
    align: 'right',
    heading: 'Contact us',
    subtext:
      "We'd love to hear from you. Reach out with questions, partnership opportunities, or to learn how you can make a difference in Venezuela.",
    primaryCta: { label: 'Donate', href: '/ways-to-give' },
    secondaryCta: { label: 'Get Involved', href: '/events' },
  },
}

export const NoImage = {
  args: {
    heading: 'Every gift changes a life',
    primaryCta: { label: 'Donate now', href: '/ways-to-give' },
  },
}
