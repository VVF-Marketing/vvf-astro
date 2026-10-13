#!/usr/bin/env node
// Starts the built server after checking the settings its mode needs
// (openspec/changes/make-app-portable, design D1). The container sets
// DB_ADAPTER/STORAGE; a missing required variable stops startup with its
// name instead of failing on the first request.
import { pathToFileURL } from 'node:url'

export function missingSettings(env = process.env) {
  const required = []
  if (env.DB_ADAPTER === 'postgres') required.push('DATABASE_URL')
  if (env.STORAGE === 's3') required.push('S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY')
  return required.filter((name) => !env[name])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const missing = missingSettings()
  if (missing.length) {
    console.error(`Missing required settings: ${missing.join(', ')} (see .env.example).`)
    process.exit(1)
  }
  await import(new URL('../dist/server/entry.mjs', import.meta.url).href)
}
