import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:4321'

export default defineConfig({
  testDir: './e2e',
  // Visual parity against the live site is opt-in (playwright.parity.config.ts).
  // Spec conformance checks run here only once they pass (tagged @conformant
  // from e2e/spec-audit/registry.ts); the full audit is playwright.spec-audit.config.ts.
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
  projects: [
    { name: 'chromium', testIgnore: ['parity/**', 'spec-audit/**'], use: devices['Desktop Chrome'] },
    { name: 'conformant', testDir: './e2e/spec-audit', grep: /@conformant/, use: devices['Desktop Chrome'] },
  ],
})
