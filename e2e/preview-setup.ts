import { mkdirSync } from 'node:fs'
import { request } from '@playwright/test'

// Global setup for playwright.preview.config.ts: one request with the
// protection bypass secret sets Vercel's bypass cookie, saved as the
// storage state every test starts from. Without a secret (an unprotected
// deployment), the state is just empty.
export default async function previewSetup() {
  const baseURL = process.env.E2E_BASE_URL!
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  const context = await request.newContext({ baseURL })
  if (secret) {
    const res = await context.get('/healthz', { headers: { 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' } })
    if (!res.ok()) throw new Error(`Bypass request answered ${res.status()}`)
  }
  mkdirSync('test-results', { recursive: true })
  await context.storageState({ path: 'test-results/preview-state.json' })
  await context.dispose()
}
