import Breadcrumbs from './Breadcrumbs.astro'

export default {
  title: 'Molecules/Breadcrumbs',
  component: Breadcrumbs,
}

export const Resource = {
  args: {
    items: [
      { label: 'Resources', href: '/resources' },
      { label: 'Financials', href: '/resources/category/financials-transparency' },
      { label: 'Impact Report 2025' },
    ],
  },
}

export const Light = {
  args: {
    tone: 'light',
    items: [{ label: 'Our Team', href: '/our-team' }, { label: 'Randy Lander' }],
  },
  parameters: { backgrounds: { default: 'navy' } },
}
