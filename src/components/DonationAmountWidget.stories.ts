import { expect, within } from 'storybook/test'
import DonationAmountWidget from './DonationAmountWidget.astro'

export default {
  title: 'Molecules/DonationAmountWidget',
  component: DonationAmountWidget,
}

export const Default = {
  args: {
    actionUrl: 'https://donorbox.org/general-donation-vvf',
  },
  // @storybook-astro/framework mounts story markup via innerHTML, so the
  // component's <script> (preset/custom exclusivity) never executes here —
  // browsers don't run scripts inserted that way. This only checks the
  // static render; the real click-driven behavior is covered by
  // e2e/donation-widget.spec.ts (real astro build+preview) and the pure
  // logic by src/lib/donationWidget.test.ts.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const preset50 = canvas.getByRole('button', { name: '50 USD' })
    const customInput = canvas.getByPlaceholderText('Custom amount (USD)')

    expect(preset50).not.toHaveClass('bg-brand-accent')
    expect(customInput).toHaveValue(null)
  },
}

export const SponsoringAChild = {
  args: {
    actionUrl: 'https://donorbox.org/embed/make-a-difference-55',
    sponsorTargetLabel: 'Maria, age 8',
    defaultCadence: 'monthly',
    presets: [30, 60, 90],
  },
}
