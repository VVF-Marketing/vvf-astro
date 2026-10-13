import { expect, test } from '@playwright/test'

// ContactForm.astro has no action/method/server handler yet (data-contact-form,
// novalidate) — this only proves the privacy-checkbox gating wired in its
// <script>, not a real submission. Revisit once a submission endpoint exists.
test('contact form submit button is gated on the privacy checkbox', async ({ page }) => {
  await page.goto('/contact')

  const submit = page.getByRole('button', { name: 'Send Message' })
  const checkbox = page.getByRole('checkbox')

  await expect(submit).toBeDisabled()

  await checkbox.check()
  await expect(submit).toBeEnabled()

  await checkbox.uncheck()
  await expect(submit).toBeDisabled()
})

test('a reach-us card preselects its topic in the form via query param', async ({ page }) => {
  await page.goto('/contact?topic=corporate-partnerships')
  await expect(page.locator('[data-topic-select]')).toHaveValue('corporate-partnerships')
})
