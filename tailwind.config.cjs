/** @type {import('tailwindcss').Config} */
// VVF design tokens, from the VVF website spec's design system (sections 5.1
// to 5.4). Colour values live in src/styles/tokens.cjs; class names predate
// the spec, and each one's comment names the spec token it implements. No
// other colour may be used (spec 5.9, check 2), so the colour palette
// replaces Tailwind's defaults instead of extending them.
const plugin = require('tailwindcss/plugin')
const { colors: c, focus } = require('./src/styles/tokens.cjs')

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      sm: '480px', // spec 5.3: large phone from 480
      md: '768px', // spec 5.3: tablet from 768 (desktop type sizes from here)
      lg: '992px', // spec 5.3: desktop from 992
      xl: '1280px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      brand: {
        primary: c.navy, // `navy`
        accent: c.blue, // `blue`: fills, bullets, and text on navy only
        'accent-text': c['blue-text'], // `blue-text`: blue text and lines on light backgrounds
      },
      neutral: {
        white: c.white, // `white`
        'light-gray': c['grey-line'], // `grey-line`
      },
      page: c.page, // `page`
      link: c.link, // `link`
      focus: { DEFAULT: focus.outline, inner: focus.inner }, // focus outline and its inner ring (Q12)
      sun: c.sun, // `sun`
      salmon: c.salmon, // `salmon`
      sky: c.sky, // `sky`
      success: { DEFAULT: c.success, dark: c['success-dark'] }, // `success`
      warning: { DEFAULT: c.warning, dark: c['warning-dark'] }, // `warning`
      error: { DEFAULT: c.error, dark: c['error-dark'] }, // `error`
      // Preflight's placeholder colour: navy, faded.
      gray: { 400: 'rgb(2 51 94 / 0.6)' },
    },
    borderColor: ({ theme }) => ({ ...theme('colors'), DEFAULT: c['grey-line'] }), // `grey-line`
    ringColor: ({ theme }) => ({ ...theme('colors'), DEFAULT: c.blue }),
    ringOffsetColor: ({ theme }) => theme('colors'),
    boxShadow: {
      card: '0 2px 16px rgba(2,51,94,0.06)', // `shadow-card` (spec 5.4)
      arrow: '0 4px 9px rgba(0,0,0,0.18)', // `shadow-arrow` (spec 5.4)
      hover: '0 8px 24px rgba(2,51,94,0.12)', // linked card hover (spec 5.6)
      none: 'none',
    },
    extend: {
      fontFamily: {
        // Nunito for headings, buttons and body text; Open Sans for taglines,
        // labels and small text (spec 5.2). Nothing else loads.
        heading: ['Nunito', 'sans-serif'],
        sans: ['Nunito', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
        label: ['"Open Sans"', 'sans-serif'],
      },
      fontSize: {
        // spec 5.2: desktop sizes from 768 px, phone sizes below.
        h1: ['3rem', { lineHeight: '1.1', fontWeight: '800' }], // H1 48
        h2: ['3rem', { lineHeight: '1.2', fontWeight: '800' }], // H2 48
        h3: ['2rem', { lineHeight: '1.2', fontWeight: '700' }], // H3 32
        h4: ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }], // H4 20
        h5: ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }], // small card titles (= H4 size)
        h6: ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }],
        'h1-mobile': ['2.25rem', { lineHeight: '1.1', fontWeight: '800' }], // H1 36
        'h2-mobile': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }], // H2 36
        'h3-mobile': ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }], // H3 24
        'h4-mobile': ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }], // H4 20
        'h5-mobile': ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }],
        'h6-mobile': ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }],
        'big-number': ['5rem', { lineHeight: '1.3', fontWeight: '800' }], // Big number 80
        'big-number-mobile': ['4rem', { lineHeight: '1.3', fontWeight: '800' }], // 64
        stat: ['3.5rem', { lineHeight: '1.16', fontWeight: '800' }], // Stat figure 56
        'stat-mobile': ['3rem', { lineHeight: '1.16', fontWeight: '800' }], // 48
        'rich-h2': ['2rem', { lineHeight: '1.2', fontWeight: '700' }], // article section heading 32
        'rich-h2-mobile': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }], // 28
        newsletter: ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }], // newsletter card title 36 (named exception, spec 5.8)
        body: ['1.125rem', { lineHeight: '1.5' }], // Body 18
        'body-mobile': ['1rem', { lineHeight: '1.5' }], // Body 16
        tagline: ['0.875rem', { lineHeight: '1.5', letterSpacing: '1.4px', fontWeight: '600' }], // Tagline 14
        button: ['1.125rem', { lineHeight: '1.5', fontWeight: '700' }], // Button 18
        'size-xs': '0.75rem',
        'size-sm': '0.875rem', // Small 14
        'size-base': '1rem',
        'size-md': '1.125rem',
        'size-lg': '1.25rem',
        'size-xl': '2.375rem',
        'size-2xl': '3.5rem',
        'size-3xl': '4.375rem',
      },
      lineHeight: {
        tight: '1.1',
        snug: '1.25',
        normal: '1.4',
        relaxed: '1.6',
        body: '1.5',
      },
      borderRadius: {
        // spec 5.4
        pill: '9999px', // `radius-pill`
        'card-lg': '2.5rem', // `radius-card-lg` 40
        card: '1.25rem', // `radius-card` 20
        'card-sm': '1rem', // `radius-card-sm` 16
        tag: '0.25rem', // `radius-tag` 4
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '2.5rem',
        full: '9999px',
        DEFAULT: '0.5rem',
      },
      spacing: {
        // spec 5.3: side gutters and section padding.
        gutter: '4rem', // 64 from 768 px
        'gutter-sm': '2rem', // 32 from 480 to 767 px
        'gutter-xs': '1.5rem', // 24 below 480 px
        'section-sm': '2.5rem', // phones: medium 40
        section: '4rem', // desktop medium 64 / phones large 64
        'section-lg': '7.5rem', // desktop large 120
        'title-gap': '4rem', // title block to content, 64 (40 on phones)
      },
      maxWidth: {
        content: '80rem', // spec 5.3: one column, at most 1280 px
        'container-medium': '75rem',
        'container-large': '80rem',
        'container-small': '480px',
        card: '417px',
      },
    },
  },
  plugins: [
    // The colour tokens as CSS variables (--navy, --blue-text, …) plus the
    // focus ring's (--focus, --focus-inner), for src/index.css and the few
    // styles Tailwind classes can't reach.
    plugin(({ addBase }) => {
      addBase({
        ':root': {
          ...Object.fromEntries(Object.entries(c).map(([name, value]) => [`--${name}`, value])),
          '--focus': focus.outline,
          '--focus-inner': focus.inner,
        },
      })
    }),
  ],
}
