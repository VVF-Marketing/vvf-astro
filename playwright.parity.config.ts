import { defineConfig, devices } from '@playwright/test'

// Opt-in visual parity check: live Webflow site vs local build.
//   npm run test:parity            (needs a running `npm run preview`)
//   LIVE_BASE_URL=https://staging.example npm run test:parity
// Writes live/local screenshots and a difference image per page and width
// to test-results/parity/. Reporting only — it never fails on pixel diffs.
export default defineConfig({
  testDir: './e2e/parity',
  // Playwright clears its outputDir on each run; keep it separate from the
  // screenshots in test-results/parity/.
  outputDir: 'test-results/.parity-runs',
  timeout: 180_000,
  workers: 2,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    // Standalone Node server from `astro build` (always runs in the foreground,
    // unlike `astro preview`, which detaches when it detects an agent).
    command: 'node ./dist/server/entry.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
})
