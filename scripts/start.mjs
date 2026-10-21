#!/usr/bin/env node
// Starts the built server after checking the settings its mode needs
// (openspec/changes/make-app-portable, design D1). The container sets
// DB_ADAPTER/STORAGE; a missing required variable stops startup with its
// name instead of failing on the first request.
import { pathToFileURL } from 'node:url'
import { missingSettings } from './lib/settings.mjs'

export { missingSettings }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const missing = missingSettings()
  if (missing.length) {
    console.error(`Missing required settings: ${missing.join(', ')} (see .env.example).`)
    process.exit(1)
  }
  await import(new URL('../dist/server/entry.mjs', import.meta.url).href)
}
