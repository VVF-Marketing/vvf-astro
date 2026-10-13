#!/usr/bin/env node
// `npm run media:copy`: copy every media file from local disk (./uploads, or
// MEDIA_SOURCE_DIR) into the S3-compatible bucket configured by the S3_*
// variables, under the same keys, so content keeps working unchanged
// (openspec/changes/make-app-portable, design D3). Files already in the
// bucket are skipped, so it's safe to re-run.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createStorage as createS3Storage } from 'emdash/storage/s3'

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
}
export const contentTypeFor = (key) => TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream'

// Storage keys are paths relative to the source directory, with / separators.
export function listKeys(dir) {
  return (readdirSync(dir, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join('/'))
    .sort()
}

export async function copyMedia({ sourceDir, target, read = (key) => readFileSync(path.join(sourceDir, key)), log = () => {} }) {
  const result = { copied: 0, skipped: 0 }
  for (const key of listKeys(sourceDir)) {
    if (await target.exists(key)) {
      result.skipped++
      continue
    }
    await target.upload({ key, body: read(key), contentType: contentTypeFor(key) })
    log(`+ ${key}`)
    result.copied++
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourceDir = path.resolve(process.env.MEDIA_SOURCE_DIR ?? 'uploads')
  const result = await copyMedia({ sourceDir, target: createS3Storage({}), log: (l) => console.log(l) })
  console.log(`Copied ${result.copied} file(s) to ${process.env.S3_BUCKET}; ${result.skipped} already there.`)
}
