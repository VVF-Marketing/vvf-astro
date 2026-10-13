import type { StorybookConfig } from '@storybook-astro/framework'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts)'],
  addons: ['@storybook/addon-docs'],
  // Harvested CMS media (scripts/migrate) so stories can show real content.
  // Child media is deliberately excluded (gitignored; minors' data).
  staticDirs: [
    { from: '../seed/media/team_members', to: '/seed-media/team_members' },
    { from: '../seed/media/events', to: '/seed-media/events' },
    { from: '../seed/media/resources', to: '/seed-media/resources' },
    { from: '../seed/media/sponsors', to: '/seed-media/sponsors' },
  ],
  framework: {
    name: '@storybook-astro/framework',
    options: {},
  },
  // Header.astro and EventCard.astro both import from the literal specifier
  // '../lib/content' (they live in src/components). That module hits emdash's
  // live sqlite CMS at module scope for getPrimaryMenu(), so Storybook's own
  // Vite instance redirects that exact specifier to a static fixture
  // (.storybook/mocks/content.ts) instead. Scoped to this file only, never
  // touches `astro dev`/`astro build`.
  async viteFinal(config) {
    config.resolve = config.resolve ?? {}
    const existing = config.resolve.alias
    const entry = { find: '../lib/content', replacement: path.resolve(dirname, './mocks/content.ts') }
    // Astro/emdash's own Vite config already populates config.resolve.alias as
    // an array of { find, replacement } entries, not a plain object, so this
    // appends to that array instead of object-spreading over it (which
    // silently corrupts the array into a plain object and breaks Vite's
    // alias plugin).
    const existingEntries = Array.isArray(existing)
      ? existing
      : existing
        ? Object.entries(existing).map(([find, replacement]) => ({ find, replacement }))
        : []
    config.resolve.alias = [...existingEntries, entry]
    return config
  },
}

export default config
