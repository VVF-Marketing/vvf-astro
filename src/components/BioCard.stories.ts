import BioCard from './BioCard.astro'

export default {
  title: 'Organisms/BioCard',
  component: BioCard,
}

// Live profile of Randy Lander (team members are public on the live site).
export const Profile = {
  args: {
    member: {
      name: 'Randy Lander',
      role: 'Founder & Chairman',
      imageUrl: '/seed-media/team_members/15177727-randy-lander.webp',
      quote: 'Randy is passionate about serving God and about servant leadership.',
      since: '2022',
      from: 'Caracas, VE',
      basedIn: 'Miami, FL',
      bio: 'A Caracas native who led global campaigns at The Boeing Company for 20 years before founding the Foundation.',
      longBio:
        'Randy Lander is the Founder and Chairman of Victoria Venezuela Foundation (VVF), a faith-based nonprofit committed to transforming the lives of vulnerable children and families throughout Venezuela.\n\nA native of Caracas, Venezuela, Randy founded VVF from a personal desire to serve his home country and create lasting opportunities for its most vulnerable communities.',
      background: [
        { label: 'Founder & President', value: 'Luminis Global Partners' },
        { label: 'MBA', value: 'Mechanical & Manufacturing Engineering' },
        { label: 'Board service', value: 'Special Olympics Washington · SME · Boeing ECF Japan' },
      ],
    },
  },
}

export const MissingFacts = {
  args: {
    member: { name: 'Sample Person', role: 'Programs', quote: 'Serving children every week.', since: '2024' },
  },
}
