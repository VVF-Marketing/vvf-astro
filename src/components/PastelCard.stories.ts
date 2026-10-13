import PastelCard from './PastelCard.astro'

export default {
  title: 'Molecules/PastelCard',
  component: PastelCard,
}

export const Sun = {
  args: {
    tone: 'sun',
    iconUrl: '/images/pages/b62b0e1d-15-nutrition.svg',
    eyebrow: 'Nutrition',
    title: 'Child Nutrition Program',
    body: 'We serve hot meals and nutritional support to children facing hunger.',
  },
}

export const Salmon = {
  args: {
    tone: 'salmon',
    iconUrl: '/images/pages/6bbc919e-expanded.svg',
    eyebrow: 'Medical',
    title: 'Healthcare Access for Children',
    body: 'Our clinics provide checkups, treatment, and preventive care where access is scarce.',
  },
}

export const SkyWithCta = {
  args: {
    tone: 'sky',
    iconUrl: '/images/pages/a037d128-vector.svg',
    eyebrow: 'Education',
    title: 'Education Support for Children',
    body: 'We keep children in school with supplies, support, and safe learning spaces.',
    cta: { label: 'Learn more', href: '/sponsor-a-child' },
  },
}

export const NoIcon = {
  args: {
    tone: 'sky',
    title: 'Monthly giving',
    body: 'A recurring gift keeps meals, checkups and classes going all year.',
  },
}
