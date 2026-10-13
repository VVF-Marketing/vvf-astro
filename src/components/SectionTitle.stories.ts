import SectionTitle from './SectionTitle.astro'

export default {
  title: 'Molecules/SectionTitle',
  component: SectionTitle,
}

export const Centered = {
  args: {
    tagline: 'About Us',
    heading: 'Victoria Venezuela Foundation',
    text: 'is a 501(c)(3) nonprofit based in Weston, Florida. We provide nutrition, medical care and education to children in Venezuela, and connect US donors with individual children through monthly sponsorship.',
  },
}

export const Left = {
  args: { tagline: 'Board', heading: 'Board of Directors', align: 'left' },
}

export const Light = {
  args: { tagline: 'Impact', heading: 'Your gifts at work', tone: 'light' },
  parameters: { backgrounds: { default: 'navy' } },
}
