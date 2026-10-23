import { devices } from '@playwright/test'
import base from './playwright.config'

// The smoke set (@smoke, e2e/smoke.spec.ts) against a pull request's Vercel
// preview (openspec/changes/add-vercel-deploy-pipeline, D3 preview-verify).
// The full suite runs in CI on SQLite and Postgres. The deploy workflow
// sets E2E_BASE_URL to the preview URL and VERCEL_AUTOMATION_BYPASS_SECRET
// to the bypass secret.
// The secret isn't sent as a header on every request (pages also load
// third-party assets): e2e/preview-setup.ts trades it once for Vercel's
// bypass cookie, which only goes back to the preview.
const baseURL = process.env.E2E_BASE_URL
if (!baseURL) throw new Error('Set E2E_BASE_URL to the preview deployment URL.')

export default {
  ...base,
  globalSetup: './e2e/preview-setup.ts',
  // A remote deployment: fewer parallel workers than a local server, and one
  // retry for a cold start.
  workers: 4,
  retries: 1,
  use: { ...base.use, baseURL, storageState: 'test-results/preview-state.json' },
  webServer: undefined,
  projects: [{ name: 'smoke', testDir: './e2e', testIgnore: ['parity/**'], grep: /@smoke/, use: devices['Desktop Chrome'] }],
}
