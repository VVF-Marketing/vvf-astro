import TicketCard from './TicketCard.astro'

export default {
  title: 'Molecules/TicketCard',
  component: TicketCard,
}

// Live 2026 Golf Tournament ticket offers.
export const PlayerFoursome = {
  args: {
    tierName: 'Player Foursome',
    price: '$1,100',
    features: ['Entry for (4) players to attend the event', 'Breakfast, lunch and drinks for (4)', 'Swag gift bag for each player', 'Color photographs at the event'],
    href: 'https://donorbox.org/events/937157/steps/choose_tickets',
    tone: 'sun',
  },
}

export const SinglePlayer = {
  args: {
    tierName: 'Single Player',
    price: '$275',
    features: ['Entry for (1) player to attend the event', 'Breakfast, lunch and drinks', 'Swag gift bag for each player', 'Color photographs at the event'],
    href: 'https://donorbox.org/events/937157/steps/choose_tickets',
    tone: 'sky',
  },
}

export const SoldOut = {
  args: {
    tierName: 'Sports Physical Therapy & Performance Lounge',
    price: '$1,000',
    href: '#',
    soldOut: true,
    tone: 'salmon',
  },
}
