import { describe, expect, it } from 'vitest'
import { MAX_BODY_BYTES, MAX_FIELD_LENGTH, deliver, isHoneypotFilled, isTooLarge, pageFrom, validate } from './forms'

const contact = { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.org', topic: 'Volunteering', message: 'Hola', privacyConsent: 'on' }

describe('validate', () => {
  it('accepts a complete contact form and keeps the English topic', () => {
    expect(validate('contact', contact)).toEqual({ ok: true, fields: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.org', phone: '', topic: 'Volunteering', message: 'Hola' } })
  })

  it('names each missing or invalid field, consent included', () => {
    expect(validate('contact', { ...contact, lastName: ' ', email: 'nope', topic: 'Voluntariado', privacyConsent: undefined })).toEqual({
      ok: false,
      invalid: ['lastName', 'email', 'topic', 'privacyConsent'],
    })
  })

  it('needs only a valid email for the newsletter', () => {
    expect(validate('newsletter', { email: 'a@b.co' })).toEqual({ ok: true, fields: { email: 'a@b.co' } })
    expect(validate('newsletter', { email: '' })).toEqual({ ok: false, invalid: ['email'] })
  })
})

describe('pageFrom', () => {
  it('keeps same-site paths only', () => {
    expect(pageFrom('/es/contact')).toBe('/es/contact')
    expect(pageFrom('https://evil.example/x')).toBe('/')
    expect(pageFrom('//evil.example')).toBe('/')
    expect(pageFrom('/\\evil.example')).toBe('/')
    expect(pageFrom(undefined)).toBe('/')
  })
})

// Review finding (PR #28): no honeypot and no size limit.
describe('abuse limits', () => {
  it('spots a filled honeypot', () => {
    expect(isHoneypotFilled({ ...contact, website: 'http://spam.example' })).toBe(true)
    expect(isHoneypotFilled({ ...contact, website: '' })).toBe(false)
    expect(isHoneypotFilled(contact)).toBe(false)
  })

  it('refuses a request without a length or over the cap', () => {
    expect(isTooLarge(new Headers({ 'content-length': '512' }))).toBe(false)
    expect(isTooLarge(new Headers({ 'content-length': String(MAX_BODY_BYTES + 1) }))).toBe(true)
    expect(isTooLarge(new Headers())).toBe(true)
  })

  it('refuses a field over the length cap', () => {
    expect(validate('contact', { ...contact, message: 'x'.repeat(MAX_FIELD_LENGTH + 1) })).toEqual({ ok: false, invalid: ['message'] })
  })
})

describe('deliver', () => {
  const submission = { form: 'contact' as const, page: '/es/contact', fields: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.org', phone: '', topic: 'Volunteering', message: 'Hola' } }

  it('reports unavailable without a mail service', async () => {
    expect(await deliver(submission)).toBe('unavailable')
  })

  it('emails both addresses with the page and the stored topic, replying to the visitor', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    expect(await deliver(submission, { apiKey: 'k' }, fetcher)).toBe('sent')
    expect(calls[0].url).toBe('https://api.resend.com/emails')
    const mail = JSON.parse(String(calls[0].init.body))
    expect(mail).toMatchObject({
      from: 'Victoria Venezuela Foundation website <website@victoriavenezuelafoundation.org>',
      to: ['info@victoriavenezuelafoundation.org', 'enrique@paulainc.ca'],
      subject: 'New Contact submission',
      reply_to: 'ana@example.org',
    })
    expect(mail.text).toContain('Topic: Volunteering')
    expect(mail.text).toContain('Sent from: /es/contact')
    expect(mail.text).not.toContain('Phone:')
  })

  it('reports unavailable when the mail service refuses', async () => {
    const fetcher = (async () => new Response('no', { status: 422 })) as unknown as typeof fetch
    expect(await deliver(submission, { apiKey: 'k' }, fetcher)).toBe('unavailable')
  })
})
