import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import emdash, { local, s3 } from 'emdash/astro';
import { postgres, sqlite } from 'emdash/db';
import { fileURLToPath } from 'node:url';
import { STATIC_REDIRECTS, DYNAMIC_REDIRECTS, redirectStatus } from './src/lib/legacyRoutes.mjs';

// https://astro.build/config
// Database (openspec/changes/make-app-portable, design D2): the build picks
// the adapter, the runtime supplies the connection. Local builds use SQLite;
// container images are built with DB_ADAPTER=postgres and read DATABASE_URL
// when the server starts (src/lib/db/postgresRuntime.mjs), so nothing about
// the database is baked into the image.
const usePostgres = process.env.DB_ADAPTER === 'postgres';
const database =
  usePostgres
    ? { ...postgres({}), entrypoint: fileURLToPath(new URL('./src/lib/db/postgresRuntime.mjs', import.meta.url)) }
    : sqlite({ url: 'file:./data.db' });

// Media storage (design D3): STORAGE=s3 at build uses any S3-compatible bucket,
// whose S3_* settings EmDash's adapter reads at runtime (nothing baked in);
// otherwise media lives on local disk as before.
const storage =
  process.env.STORAGE === 's3'
    ? s3()
    : local({
        directory: './uploads',
        baseUrl: '/_emdash/api/media/file',
      });

// Runtime configuration (make-app-portable, design D1): secrets are read from
// the environment when the server starts, never inlined into the build, so
// one image runs in every environment. `validateSecrets` stops startup with
// the variable's name when one is invalid; scripts/start.mjs checks the ones a
// mode requires (e.g. DATABASE_URL for Postgres). The site URL stays a
// build-time constant on purpose: every environment's canonical URLs point at
// production. S3_* settings are read by EmDash's s3 adapter itself.
const env = {
  validateSecrets: true,
  schema: {
    EMDASH_SYNC_PAT: envField.string({ context: 'server', access: 'secret', optional: true }),
    SAFEGUARDING_USERS: envField.string({ context: 'server', access: 'secret', optional: true }),
    DTD_PUBLIC_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    // Optional here (Astro also checks required secrets at build); required at
    // startup in Postgres mode by scripts/start.mjs.
    DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    DATABASE_SSL: envField.boolean({ context: 'server', access: 'secret', optional: true }),
  },
};

export default defineConfig({
  env,
  // Sessions (design D4): in the database when deployed (Postgres), so they
  // survive container replacement and work across instances; Astro's default
  // filesystem sessions locally.
  ...(usePostgres
    ? { session: { driver: { entrypoint: fileURLToPath(new URL('./src/lib/db/sessionDriver.mjs', import.meta.url)), config: { tableName: 'astro_sessions' } } } }
    : {}),
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
      database,
      storage,
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