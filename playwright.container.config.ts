import base from './playwright.config'

// e2e against a site that's already running, e.g. the container image on
// Postgres + S3 in CI (openspec/changes/make-app-portable, design D9).
// The base URL comes from E2E_BASE_URL (default http://localhost:4321).
//
// Seeding Postgres (npm run db:setup) loads the public seed without media
// files, so the two tests that need uploaded media run only in the SQLite
// e2e job, whose `npm run seed` imports them. Media portability itself is
// covered by media:copy and data:import.
export default {
  ...base,
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4321' },
  webServer: undefined,
  grepInvert: /a resource with a report offers a locally hosted PDF download|resource page uses its CMS SEO fields/,
}
