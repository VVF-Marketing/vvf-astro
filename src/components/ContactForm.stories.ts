import { expect, within } from 'storybook/test'
import ContactForm from './ContactForm.astro'

export default {
  title: 'Molecules/ContactForm',
  component: ContactForm,
}

export const Default = {
  args: {},
  // @storybook-astro/framework mounts story markup via innerHTML, so the
  // component's <script> (privacy-checkbox gating) never executes here —
  // browsers don't run scripts inserted that way. This only checks the
  // static render; the real click-driven gating is covered by
  // e2e/contact-form.spec.ts (real astro build+preview).
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const submit = canvas.getByRole('button', { name: 'Send Message' })
    const checkbox = canvas.getByRole('checkbox')

    expect(submit).toBeDisabled()
    expect(checkbox).not.toBeChecked()
  },
}

export const PreselectedTopic = {
  args: { defaultTopic: 'corporate-partnerships' },
}
