import { defineConfig, devices } from '@playwright/test'
import { blockAllButWidgets, blockThirdParty, WIDGET_CHECKS } from './e2e/third-party-hosts'

// Spec conformance audit (e2e/spec-audit, registry in e2e/spec-audit/registry.ts):
//   npm run test:spec-audit
// Runs against the production server build on its own port, so it never
// fights a running dev server. Results go to the gitignored .spec-audit/
// folder for scripts/spec-audit/report.mjs. Many checks fail until their
// fix batch lands; checks that pass are tagged @conformant and also run in
// `npm run test:e2e` (playwright.config.ts).
const port = 4393
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e/spec-audit',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results/spec-audit',
  fullyParallel: true,
  // Every check gets a result; retries would hide flaky behaviour.
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.spec-audit/results.json' }]],
  use: {
    baseURL,
    // The audit measures this site: third-party hosts are cut
    // (e2e/third-party-hosts.ts), except Donorbox and Double the Donation
    // for the widget checks' own project below.
    launchOptions: blockThirdParty,
  },
  webServer: {
    command: 'node ./dist/server/entry.mjs',
    url: baseURL,
    // The GTM snippet renders as in production (8.9-3); its hosts are cut above.
    env: { PORT: String(port), GTM_CONTAINER_ID: 'GTM-W33SN672' },
    reuseExistingServer: true,
  },
  projects: [
    // Desktop checks.
    { name: 'checks', grepInvert: [/@layout/, WIDGET_CHECKS], use: devices['Desktop Chrome'] },
    // The viewport sweep (5.9-1, 5.9-9): slow, so a project of its own.
    { name: 'layout', grep: /@layout/, grepInvert: WIDGET_CHECKS, use: devices['Desktop Chrome'] },
    // The widgets render and respond (8.9-6): their hosts stay reachable.
    { name: 'widgets', grep: WIDGET_CHECKS, use: { ...devices['Desktop Chrome'], launchOptions: blockAllButWidgets } },
  ],
})
