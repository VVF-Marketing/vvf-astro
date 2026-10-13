import AppealCards from './AppealCards.astro'

export default {
  title: 'Molecules/AppealCards',
  component: AppealCards,
  parameters: { backgrounds: { default: 'navy' } },
}

// Live Earthquake Relief "What your gift will pay for" cards.
export const EarthquakeRelief = {
  args: {
    label: 'What your gift will pay for',
    cards: [
      {
        title: 'Shelter',
        text: 'A safe place to stay for families whose homes were destroyed in the June 2026 earthquakes.',
        imageUrl: '/images/pages/467d8fd3-vvf-laguaira-card-shelter-web-v1.jpg',
      },
      {
        title: 'Medical care',
        text: 'Check-ups, medicine and treatment for children and their families at the center.',
        imageUrl: '/images/pages/2631b854-vvf-laguaira-card-medicalcare-web-v1.jpg',
      },
      {
        title: 'Nutrition',
        text: 'Daily meals for the children staying at the support center in La Guaira.',
        imageUrl: '/images/pages/c84863db-vvf-laguaira-card-nutrition-web-v1.jpg',
      },
    ],
  },
}
