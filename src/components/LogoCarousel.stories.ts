import { expect, within } from 'storybook/test'
import LogoCarousel from './LogoCarousel.astro'
import type { LogoItem } from './LogoCarousel.astro'

// Live Corporate Partners logos (harvested CMS media).
const logos: LogoItem[] = [
  { name: 'Boeing', logoUrl: '/seed-media/sponsors/5717a4b6-boeing-full-logo-variant-1-1.svg' },
  { name: 'KP Aviation', logoUrl: '/seed-media/sponsors/b634372f-kp-aviation-logo.png' },
  { name: 'Microsoft', logoUrl: '/seed-media/sponsors/516733ca-frame-385.png' },
  { name: 'Paula Inc.', logoUrl: '/seed-media/sponsors/204d5dfc-vvf-golf2026-sponsor-paulainc-v1.svg' },
  { name: 'Santa Teresa 1796', logoUrl: '/seed-media/sponsors/03e84d10-vvf-golf2026-sponsor-santateresa1796rum-v1.png' },
  { name: 'The Trusty Handyman', logoUrl: '/seed-media/events/36778d37-the-trusty-handyman-logo-1.png' },
]

export default {
  title: 'Molecules/LogoCarousel',
  component: LogoCarousel,
}

export const Default = {
  args: { logos, heading: 'Corporate Partners' },
  // @storybook-astro/framework mounts story markup via innerHTML, so the
  // client <script> driving next/prev never executes here — only the
  // static render is checked. Scroll math is covered by
  // src/lib/carousel.test.ts. Arrows stay hidden until that script detects
  // overflow (hidden elements have no accessible name), so they're found by
  // their labels directly.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvasElement.querySelector('button[aria-label="Next logos"]')).not.toBeNull()
    expect(canvasElement.querySelector('button[aria-label="Previous logos"]')).not.toBeNull()
    expect(canvas.getAllByRole('img')).toHaveLength(6)
  },
}
