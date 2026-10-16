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

// Topics are stored by their English name (spec 7.14); an unknown value
// leaves the prompt chosen.
test('?topic= preselects the form topic by its stored value', async ({ page }) => {
  await page.goto('/contact?topic=Corporate%20partnership')
  await expect(page.locator('[data-topic-select]')).toHaveValue('Corporate partnership')
  await page.goto('/es/contact?topic=Volunteering')
  await expect(page.locator('[data-topic-select]')).toHaveValue('Volunteering')
  await page.goto('/contact?topic=not-a-topic')
  await expect(page.locator('[data-topic-select]')).toHaveValue('')
})
