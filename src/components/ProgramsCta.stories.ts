import ProgramsCta from './ProgramsCta.astro'

export default {
  title: 'Molecules/ProgramsCta',
  component: ProgramsCta,
}

// Live home page "Where your money goes".
export const OneAction = {
  args: {
    heading: 'Where your money goes',
    text: 'In fiscal 2025, 95% of funds went directly to programs. To date we have served more than 77,300 meals and funded more than 1,012 medical visits for children. Our full financials are published in our annual reports.',
    primaryCta: { label: 'See our financials', href: '/resources/category/financials-transparency' },
  },
}

export const TwoActions = {
  args: {
    heading: 'Where your money goes',
    text: 'In fiscal 2025, 95% of funds went directly to programs.',
    primaryCta: { label: 'See our financials', href: '/resources/category/financials-transparency' },
    secondaryCta: { label: 'Contact us', href: '/contact' },
  },
}
