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

// An SVG saved with a viewBox but no width or height (the Marlins logo on
// Webflow, Oct 2026) still fills its slot instead of shrinking to nothing.
const SIZELESS_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#0a2240"/></svg>')}`

export const SvgWithoutSize = {
  args: { logos: [{ name: 'Sizeless logo', logoUrl: SIZELESS_SVG }] },
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole('img', { name: 'Sizeless logo' })
    await new Promise((resolve) => (img.complete ? resolve(null) : img.addEventListener('load', resolve, { once: true })))
    expect(img.getBoundingClientRect().width).toBeGreaterThan(0)
  },
}
