import Eyebrow from './Eyebrow.astro'

export default {
  title: 'Atoms/Eyebrow',
  component: Eyebrow,
}

export const Accent = {
  args: { slots: { default: 'About Us' } },
}

export const Light = {
  args: { tone: 'light', slots: { default: 'Impact' } },
  parameters: { backgrounds: { default: 'navy' } },
}
