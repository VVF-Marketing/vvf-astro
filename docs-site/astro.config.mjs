import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'VVF Astro Docs',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/anclist/vvf-astro' },
      ],
      sidebar: [
        { label: 'Getting Started', link: '/getting-started/' },
        { label: 'Architecture & Content Model', link: '/architecture/' },
        { label: 'Component Library', link: '/components/' },
        { label: 'Styling & Design Tokens', link: '/styling/' },
        { label: 'Design Token Reference', link: '/design-tokens/' },
        { label: 'Localization & Page Copy', link: '/localization-and-copy/' },
        { label: 'Marketing Access & Safeguards', link: '/marketing-access/' },
        { label: 'Editing the Site (Marketing Guide)', link: '/marketing-guide/' },
        { label: 'Webflow Migration', link: '/migration/' },
        { label: 'Testing & CI', link: '/testing-and-ci/' },
      ],
    }),
  ],
});
