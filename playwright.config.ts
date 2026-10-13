import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:4321'

export default defineConfig({
  testDir: './e2e',
  // Visual parity against the live site is opt-in (playwright.parity.config.ts).
  testIgnore: ['parity/**'],
  outputDir: 'test-results/e2e',
  fullyParallel: true,
  use: { baseURL },
  webServer: {
    // Standalone Node server from `astro build` (always runs in the foreground,
    // unlike `astro preview`, which detaches when it detects an agent).
    command: 'node ./dist/server/entry.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
})
