// POST /api/forms/contact and /api/forms/newsletter (spec 8.4): normal HTML
// form posts. Validates, hands the submission to `deliver`, and sends the
// visitor back to the page they came from with the result, which the form
// shows in the page's language (`?form=<result>#<form id>`).
import type { APIRoute } from 'astro'
import { FORM_MAIL_FROM, FORM_MAIL_TO, deliver, FORMS, isHoneypotFilled, isTooLarge, pageFrom, validate, type FormName, type FormResult } from '../../../lib/forms'
import { FORM_MAIL_API_KEY, FORM_MAIL_FROM as MAIL_FROM, FORM_MAIL_TO as MAIL_TO } from 'astro:env/server'

export const prerender = false

const ANCHOR: Record<FormName, string> = { contact: 'contact-form', newsletter: 'newsletter' }

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const form = params.form as FormName
  if (!FORMS.includes(form)) return new Response('Not found', { status: 404 })
  if (isTooLarge(request.headers)) return new Response('Payload too large', { status: 413 })
  const data = Object.fromEntries(await request.formData())
  const page = pageFrom(data.page)
  // A bot that filled the hidden field is told it worked, and nothing is sent.
  if (isHoneypotFilled(data)) return redirect(`${page}?form=sent#${ANCHOR[form]}`, 303)
  const checked = validate(form, data)
  const result: FormResult = checked.ok ? await deliver({ form, page, fields: checked.fields }, { apiKey: FORM_MAIL_API_KEY, from: MAIL_FROM || FORM_MAIL_FROM, to: MAIL_TO || FORM_MAIL_TO }) : 'invalid'
  return redirect(`${page}?form=${result}#${ANCHOR[form]}`, 303)
}
