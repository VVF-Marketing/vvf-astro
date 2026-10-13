import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import { STATIC_REDIRECTS, DYNAMIC_REDIRECTS, redirectStatus } from './src/lib/legacyRoutes.mjs';

// https://astro.build/config
export default defineConfig({
  // Canonical/Open Graph URLs (Layout.astro).
  site: 'https://www.victoriavenezuelafoundation.org',
  // Old Webflow URLs → project routes (301; 302 for temporary ones).
  redirects: Object.fromEntries(
    Object.entries({ ...STATIC_REDIRECTS, ...DYNAMIC_REDIRECTS }).map(([from, to]) => [from, { status: redirectStatus(from), destination: to }])
  ),
  // en-US unprefixed, es-VE under /es (as on the live site). Pages are written
  // once: src/middleware.ts rewrites /es/... to the shared page module, and
  // content falls back es -> en in the content adapter. Astro's own `fallback`
  // isn't used: in production builds its rewritten responses come back as 302.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', { path: 'es', codes: ['es', 'es-VE'] }],
    routing: { prefixDefaultLocale: false },
  },
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
      plugins: [
        // Publishing activity log (who published what, and how); see the module.
        {
          id: 'activity-log',
          version: '1.0.0',
          format: 'standard',
          entrypoint: fileURLToPath(new URL('./src/plugins/activityLog.ts', import.meta.url)),
          // content:read: EmDash only runs publish hooks for plugins that hold it.
          capabilities: ['content:read'],
          allowedHosts: [],
          storage: { entries: { indexes: ['timestamp', 'action', 'collection', 'userId'] } },
          adminPages: [{ path: '/activity', label: 'Activity', icon: 'history' }],
        },
      ],
    }),
  ],
});