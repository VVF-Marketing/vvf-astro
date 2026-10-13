import TeamMemberCard from './TeamMemberCard.astro'

export default {
  title: 'Molecules/TeamMemberCard',
  component: TeamMemberCard,
}

export const WithProfile = {
  args: {
    member: { name: 'Randy Lander', role: 'Chairman', profileSlug: 'randy-lander', imageUrl: '/seed-media/team_members/15177727-randy-lander.webp' },
  },
}

export const WithoutProfile = {
  args: {
    member: { name: 'Helen Bello', role: 'Vice Chair', imageUrl: '/seed-media/team_members/1822aacd-helen-bello.webp' },
  },
}

export const OpenSeat = {
  args: {
    member: { name: 'Join our board', role: "We're looking for a new board member" },
    openSeat: { kicker: 'Board seat open', heading: 'Help guide the Foundation', cta: 'Get in touch', href: '/contact' },
  },
}
