/** @type {import('tailwindcss').Config} */
// VVF design tokens, mirrored 1:1 from the live Webflow site's CSS custom
// properties (vvfstaging.webflow.shared.css). Each token names the live
// variable it comes from; the same values are exposed as CSS variables in
// src/index.css. Do not add raw hex values in components — add a token here.
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    // Webflow breakpoints (max-width 479/767/991, min-width 1280) as
    // Tailwind's mobile-first min-widths.
    screens: {
      sm: '480px', // Webflow mobile-landscape (max-width 479px)
      md: '768px', // Webflow tablet (max-width 767px)
      lg: '992px', // Webflow desktop (max-width 991px)
      xl: '1280px', // Webflow @media (min-width:1280px)
    },
    extend: {
      colors: {
        brand: {
          primary: '#02335e', // --base-color-branding--brand-primary
          accent: '#00abf9', // --base-color-branding--brand-accent
          'accent-soft': '#6fb9ea', // live .crumbs_link on dark backgrounds (no variable)
        },
        neutral: {
          white: '#ffffff', // --base-color-branding--neutral-white
          100: '#f8f9fa', // --base-color-branding--neutral-100
          'light-gray': '#e7e7e7', // --base-color-branding--neutral-light-gray
          'bg-gray': '#f9f9f9', // --base-color-branding--bg-gray
          section: '#f5f5f5', // live .section-2.is-grey / .body-3 (event pages; hard-coded on live)
          'table-darker': '#dddddd', // live .sponsor-title-darker-gray
          'table-dark': '#ededed', // live .sponsor-title-dark-gray
          card: '#f7f7f7', // live children-list card background (hard-coded on live, no variable)
          ink: '#222222', // Webflow default .w-tab-link color (inactive sponsor tier tabs)
        },
        page: '#f2f2f2', // --body-background
        link: '#1e73be', // --link-color--link-primary
        focus: '#1e73be', // --base-color-system--focus-state
        sun: '#f9eac6', // --base-color-system--sun
        salmon: '#ffd7d7', // --base-color-system--salmon
        sky: '#c1e7f5', // --base-color-system--sky
        success: { DEFAULT: '#cef5ca', dark: '#114e0b' }, // --base-color-system--success-green(-dark)
        warning: { DEFAULT: '#fcf8d8', dark: '#5e5515' }, // --base-color-system--warning-yellow(-dark)
        error: { DEFAULT: '#f8e4e4', dark: '#3b0b0b' }, // --base-color-system--error-red(-dark)
        'table-border': '#dce4ec', // live .article_body table/th/td border (page style block, no variable)
        'table-note': '#7c878f', // live .article_body table + p (source note after a table, no variable)
      },
      fontFamily: {
        heading: ['Nunito', 'sans-serif'], // --base-fonts-branding--font-heading
        sans: ['Nunito', 'sans-serif'], // --base-fonts-branding--font-body
        body: ['"Open Sans"', 'sans-serif'], // live `p` / copy classes
        poppins: ['Poppins', 'sans-serif'], // live sponsorship benefits grid
      },
      fontSize: {
        h1: ['4rem', { lineHeight: '1.1', fontWeight: '800' }], // live h1
        h2: ['3rem', { lineHeight: '1.2', fontWeight: '800' }], // live h2 / --_typography---text-sizes--heading-2
        h3: ['2rem', { lineHeight: '1.2', fontWeight: '800' }], // live h3
        h4: ['2rem', { lineHeight: '1.4', fontWeight: '800' }], // live h4 / --_typography---text-sizes--heading-4
        h5: ['1.25rem', { lineHeight: '1.5', fontWeight: '800' }], // live h5
        h6: ['1.25rem', { lineHeight: '1.5', fontWeight: '800' }], // live h6 / --_typography---text-sizes--heading-6
        'h1-mobile': ['2.5rem', { lineHeight: '1.1', fontWeight: '800' }], // live h1 @media (max-width:767px)
        'h2-mobile': ['2rem', { lineHeight: '1.2', fontWeight: '800' }], // live h2 @media (max-width:767px)
        'h3-mobile': ['1.5rem', { lineHeight: '1.2', fontWeight: '800' }], // live h3 @media (max-width:767px)
        'h4-mobile': ['1.25rem', { lineHeight: '1.4', fontWeight: '800' }], // live h4 @media (max-width:767px)
        'h5-mobile': ['1rem', { lineHeight: '1.5', fontWeight: '800' }], // live h5 @media (max-width:767px)
        'h6-mobile': ['0.875rem', { lineHeight: '1.5', fontWeight: '800' }], // live h6 @media (max-width:767px)
        body: ['1.125rem', { lineHeight: '1.5' }], // live p / --_typography---text-sizes--text-medium
        'size-xs': '0.75rem', // --text-size--xs
        'size-sm': '0.875rem', // --text-size--sm
        'size-base': '1rem', // --text-size--base
        'size-md': '1.125rem', // --text-size--md
        'size-lg': '20px', // --text-size--lg
        'size-xl': '2.375rem', // --text-size--xl
        'size-2xl': '3.5rem', // --text-size--2xl
        'size-3xl': '4.375rem', // --text-size--3xl
      },
      lineHeight: {
        tight: '1.1', // --line-height--tight
        snug: '1.25', // --line-height--snug
        normal: '1.4', // --line-height--normal
        relaxed: '1.6', // --line-height--relaxed
        body: '1.5', // live body / .button line-height
      },
      borderRadius: {
        sm: '0.25rem', // --radius--sm
        md: '0.5rem', // --radius--md
        lg: '0.75rem', // --radius--lg
        xl: '1rem', // --radius--xl
        '2xl': '2.5rem', // --radius--2xl
        full: '9999px', // --radius--full
        pill: '100px', // live .button border-radius
        DEFAULT: '0.5rem', // = --radius--md
      },
      spacing: {
        // --spacing--1…24 match Tailwind's default 4px scale already.
        gutter: '1.25rem', // --spacing--padding-global
        'section-sm': '3rem', // --spacing--section-sm
        section: '5rem', // --spacing--section-md
        'section-lg': '6.25rem', // --spacing--section-lg
      },
      maxWidth: {
        'container-medium': '75rem', // --container--medium
        'container-large': '83.75rem', // --container--large
        'container-small': '480px', // --_spacing-sizing---max-width--max-width-small
        card: '417px', // --card-max-width
      },
    },
  },
  plugins: [],
}
