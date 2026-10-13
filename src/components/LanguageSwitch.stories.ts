import LanguageSwitch from './LanguageSwitch.astro'

// "EN / ES" language switch (live `.lang-switch_component`). Reads the page's
// locale from the URL and its labels from site-wide copy; stories render on
// the navy background it always sits on.
export default {
  title: 'Molecules/LanguageSwitch',
  component: LanguageSwitch,
}

export const Nav = {
  args: { variant: 'nav' },
}

export const Footer = {
  args: { variant: 'footer' },
}

export const WithTranslatedSlug = {
  args: { variant: 'nav', alternates: { en: '/events/golf', es: '/es/events/golf-es' } },
}
