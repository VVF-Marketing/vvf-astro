import FeatureCard from './FeatureCard.astro'

export default {
  title: 'Molecules/FeatureCard',
  component: FeatureCard,
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

export const Reward = {
  args: {
    tone: 'white',
    iconUrl: '/images/pages/f11a8c87-vvf-icon-reward-letters-v1.svg',
    title: 'Letters from your child',
    body: 'Handwritten notes and drawings that bring their world to yours.',
  },
}

export const Stat = {
  args: {
    tone: 'salmon',
    iconUrl: '/images/pages/b62b0e1d-15-nutrition.svg',
    title: 'Meals served',
    figure: '77,300+',
    body: 'Nutritious meals for children in Venezuela.',
  },
}
