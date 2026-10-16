// VVF colour tokens: the one place their values live. Named after the VVF
// website spec's tokens (5.1). tailwind.config.cjs builds its palette from
// them, the same values reach CSS as variables (--navy, --blue, …, written by
// the Tailwind plugin there), and the spec audit's palette check (5.9-2)
// reads them too. No other colour may be used (5.9, check 2): add a colour
// here, never as a literal in a component.

const colors = {
  navy: '#02335e', // headings, body text, navbar, dark bands, outline-navy buttons
  blue: '#00abf9', // primary button fill, bullets, focus outline; text only on navy
  // Blue text on light backgrounds, the Outline button and the big impact
  // figures (Enrique, Q13 on the spec card, 2026-10-14): `blue` is 2.56:1 on
  // white, under WCAG AA. 5.16:1 on white, 4.61:1 on `page`; on the pastels
  // only 3.9 to 4.3:1, enough for large text and lines.
  'blue-text': '#0074a9',
  sky: '#c1e7f5', // pastel card and section background
  sun: '#f9eac6', // pastel card and section background
  salmon: '#ffd7d7', // pastel card and section background
  'grey-line': '#e7e7e7', // borders and dividers
  white: '#ffffff', // cards, text on navy
  page: '#f2f2f2', // page background
  link: '#1e73be', // links in body text
  success: '#cef5ca', // status message background
  'success-dark': '#114e0b', // status message text
  warning: '#fcf8d8', // status message background
  'warning-dark': '#5e5515', // status message text
  error: '#f8e4e4', // status message background
  'error-dark': '#3b0b0b', // status message text
}

// Keyboard focus (Q12 on the spec card): a `blue` outline with a `navy` ring
// inside it, so it shows on white (12.8:1) and against blue fills (5:1).
const focus = {
  outline: colors.blue,
  inner: colors.navy,
}

module.exports = { colors, focus }
