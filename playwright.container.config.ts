import base from './playwright.config'

// e2e against a site that's already running, e.g. the container image on
// Postgres + S3 in CI (openspec/changes/make-app-portable, design D9).
// The base URL comes from E2E_BASE_URL (default http://localhost:4321).
// `npm run db:setup` seeds the public media too
// (openspec/changes/seed-postgres-with-media), so the whole suite runs.
export default {
  ...base,
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4321' },
  webServer: undefined,
}
