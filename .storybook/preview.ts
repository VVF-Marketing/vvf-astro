import type { Preview } from '@storybook-astro/framework'
import './preview.css'

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    // Live page backgrounds: --body-background, white cards, navy sections.
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page', value: '#f2f2f2' },
        { name: 'white', value: '#ffffff' },
        { name: 'navy', value: '#02335e' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
