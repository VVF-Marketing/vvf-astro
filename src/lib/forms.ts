// The site's two forms (spec 8.4): Contact and Newsletter. Both post as
// normal HTML forms (so HubSpot can collect them later) to
// /api/forms/<form>, carrying the page they were sent from.
//
// Delivery (8.4 rule 1; Q9 on the spec card: a transactional email service
// now, HubSpot later): every submission is emailed to info@ and enrique@
// through Resend, from "Victoria Venezuela Foundation website", with the
// visitor's address as reply-to. Without an API key nothing is sent and the
// visitor is told to write to info@ instead, so no message is lost silently.
import { isContactTopic } from './contactTopics'

export const FORMS = ['contact', 'newsletter'] as const
export type FormName = (typeof FORMS)[number]
export type FormResult = 'sent' | 'invalid' | 'unavailable'

export interface Submission {
  form: FormName
  page: string
  fields: Record<string, string>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The page a form was sent from: a same-site path only (`/\\host` reads as
// `//host` to browsers, so a backslash after the first slash is refused too).
export function pageFrom(value: unknown): string {
  const page = typeof value === 'string' ? value.trim() : ''
  return /^\/(?![/\\])[^\s?#\\]*$/.test(page) ? page : '/'
}

// Spam and abuse limits (8.4 rule 6 leaves captchas out until spam starts):
// a hidden field people never see but bots fill in, and a size cap on the
// request and on each field.
export const HONEYPOT = 'website'
export const MAX_BODY_BYTES = 16 * 1024
export const MAX_FIELD_LENGTH = 5000

export function isHoneypotFilled(data: Record<string, unknown>): boolean {
  return typeof data[HONEYPOT] === 'string' && data[HONEYPOT] !== ''
}

// A form post without a length, or over the cap, is refused before reading.
export function isTooLarge(headers: Headers): boolean {
  const length = Number(headers.get('content-length'))
  return !Number.isFinite(length) || length <= 0 || length > MAX_BODY_BYTES
}

// Server-side check of what the browser checks first (8.4 rule 4). Returns
// the cleaned fields, or the names of the fields that fail.
export function validate(form: FormName, data: Record<string, unknown>): { ok: true; fields: Record<string, string> } | { ok: false; invalid: string[] } {
  const get = (k: string) => (typeof data[k] === 'string' ? (data[k] as string).trim() : '')
  const tooLong = Object.entries(data).filter(([, v]) => typeof v === 'string' && v.length > MAX_FIELD_LENGTH).map(([k]) => k)
  if (tooLong.length) return { ok: false, invalid: tooLong }
  if (form === 'newsletter') {
    const email = get('email')
    return EMAIL.test(email) ? { ok: true, fields: { email } } : { ok: false, invalid: ['email'] }
  }
  const fields = { firstName: get('firstName'), lastName: get('lastName'), email: get('email'), phone: get('phone'), topic: get('topic'), message: get('message') }
  const invalid = [
    ...(['firstName', 'lastName', 'message'] as const).filter((k) => !fields[k]),
    ...(EMAIL.test(fields.email) ? [] : ['email']),
    // The stored topic is its English name, whatever the page language (7.14).
    ...(isContactTopic(fields.topic) ? [] : ['topic']),
    ...(data.privacyConsent ? [] : ['privacyConsent']),
  ]
  return invalid.length ? { ok: false, invalid } : { ok: true, fields }
}

export interface MailConfig {
  apiKey?: string
  from?: string
  to?: string
}

export const FORM_MAIL_FROM = 'Victoria Venezuela Foundation website <website@victoriavenezuelafoundation.org>'
export const FORM_MAIL_TO = 'info@victoriavenezuelafoundation.org,enrique@paulainc.ca'

const FORM_TITLE: Record<FormName, string> = { contact: 'Contact', newsletter: 'Newsletter' }
const FIELD_LABEL: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  topic: 'Topic',
  message: 'Message',
}

// The email for a submission: one line per field, then the page it came from.
export function submissionEmail(submission: Submission, config: MailConfig = {}) {
  const lines = Object.entries(submission.fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${v}`)
  return {
    from: config.from || FORM_MAIL_FROM,
    to: (config.to || FORM_MAIL_TO).split(',').map((a) => a.trim()).filter(Boolean),
    subject: `New ${FORM_TITLE[submission.form]} submission`,
    reply_to: submission.fields.email || undefined,
    text: [...lines, '', `Sent from: ${submission.page}`].join('\n'),
  }
}

// Sends a submission to its addresses. 'unavailable' when no mail service is
// configured or it refuses the message.
export async function deliver(submission: Submission, config: MailConfig = {}, fetcher: typeof fetch = fetch): Promise<FormResult> {
  if (!config.apiKey) return 'unavailable'
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionEmail(submission, config)),
    })
    return res.ok ? 'sent' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
