import ChecklistPanel from './ChecklistPanel.astro'

export default {
  title: 'Organisms/ChecklistPanel',
  component: ChecklistPanel,
}

// Live Sponsor a Child "What sponsorship provides".
export const SponsorshipProvides = {
  args: {
    tagline: 'Impact',
    heading: 'What sponsorship provides',
    text: 'Your commitment reaches far',
    items: [
      { title: 'Weekly nutritious meals:', text: 'Food that builds strength and hope' },
      { title: 'Dignified access to education:', text: 'Supplies, uniforms, and the tools to learn' },
      { title: 'Medical checkups twice a year:', text: 'A doctor sees your child twice a year, and treatment is covered when something is wrong.' },
      { title: 'Connection with you:', text: 'The knowledge that they matter through a real connection' },
    ],
  },
}
