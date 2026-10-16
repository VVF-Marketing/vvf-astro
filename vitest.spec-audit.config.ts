import { defineConfig } from 'vitest/config'

// Spec conformance checks that run at the data or build level (see
// e2e/spec-audit/registry.ts). Kept out of the default Vitest run: failing
// checks describe known work, not regressions.
export default defineConfig({
  test: {
    include: ['e2e/spec-audit/**/*.audit.ts'],
    environment: 'node',
    reporters: ['default', ['json', { outputFile: '.spec-audit/vitest-results.json' }]],
  },
})
