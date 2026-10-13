import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import { STATIC_REDIRECTS, DYNAMIC_REDIRECTS } from './src/lib/legacyRoutes.mjs';

// https://astro.build/config
export default defineConfig({
  // Canonical/Open Graph URLs (Layout.astro).
  site: 'https://www.victoriavenezuelafoundation.org',
  // Old Webflow URLs → project routes (301).
  redirects: Object.fromEntries(
    Object.entries({ ...STATIC_REDIRECTS, ...DYNAMIC_REDIRECTS }).map(([from, to]) => [from, { status: 301, destination: to }])
  ),
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    emdash({
      database: sqlite({ url: 'file:./data.db' }),
      storage: local({
        directory: './uploads',
        baseUrl: '/_emdash/api/media/file',
      }),
    }),
  ],
});