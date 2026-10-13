import Button from './Button.astro'

export default {
  title: 'Atoms/Button',
  component: Button,
}

export const Primary = {
  args: { href: '/ways-to-give', variant: 'primary', slots: { default: 'Donate' } },
}

export const PrimaryInverse = {
  args: { href: '/ways-to-give', variant: 'primary-inverse', slots: { default: 'Sponsor a Child' } },
  parameters: { backgrounds: { default: 'navy' } },
}

export const Outline = {
  args: { href: '/contact', variant: 'outline', slots: { default: 'Volunteer' } },
}

export const OutlineNavy = {
  args: { href: '/contact', variant: 'outline-navy', slots: { default: 'Contact Us' } },
}

export const Link = {
  args: { href: '/resources', variant: 'link', slots: { default: 'Read on' } },
}

export const Small = {
  args: { href: '#', variant: 'primary', size: 'sm', slots: { default: 'Bid Now' } },
}

export const Large = {
  args: { href: '#', variant: 'primary', size: 'lg', slots: { default: 'Buy Tickets' } },
}

export const Submit = {
  args: { type: 'submit', variant: 'primary', slots: { default: 'Send message' } },
}

export const Disabled = {
  args: { type: 'submit', variant: 'primary', disabled: true, slots: { default: 'Send message' } },
}

export const Icon = {
  args: { variant: 'icon', 'aria-label': 'Previous', slots: { default: '‹' } },
}
