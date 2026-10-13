import MediaSplit from './MediaSplit.astro'

export default {
  title: 'Organisms/MediaSplit',
  component: MediaSplit,
}

export const Default = {
  args: { tagline: 'Sponsorship', heading: 'Sponsor a child', text: 'Your monthly gift funds meals, medical care and school.', imageUrl: '/images/og-default.jpg' },
}

export const WithCaptionedCard = {
  args: {
    tagline: 'Nourishment',
    heading: 'Nutrition program feeds hungry children',
    text: 'We serve weekly nutritious meals at local church centers.',
    imageUrl: '/images/og-default.jpg',
    imageSide: 'right',
    card: { tone: 'sun', title: 'Families strengthened', text: 'Ordinary people discover they can do extraordinary things for their neighbors.' },
  },
}
