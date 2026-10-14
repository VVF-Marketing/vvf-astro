// Browser-side checks for the site's forms (spec 8.4, rule 4): required
// fields and the consent box are checked before sending, with the messages
// in the page's language rather than the browser's. Messages come from the
// form's data attributes (data-msg-required, -email, -topic, -consent).

function messageFor(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, form: HTMLFormElement): string {
  const msg = form.dataset
  if (field instanceof HTMLInputElement && field.type === 'checkbox') return msg.msgConsent ?? ''
  if (field instanceof HTMLSelectElement) return msg.msgTopic ?? msg.msgRequired ?? ''
  if (field.validity.valueMissing) return msg.msgRequired ?? ''
  if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email') return msg.msgEmail ?? ''
  return ''
}

export function localizeValidation(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
    field.addEventListener('invalid', () => field.setCustomValidity(messageFor(field, form)))
    const clear = () => field.setCustomValidity('')
    field.addEventListener('input', clear)
    field.addEventListener('change', clear)
  })
}
