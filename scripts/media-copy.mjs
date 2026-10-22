#!/usr/bin/env node
// `npm run media:copy [-- --from local|s3] [-- --to s3|blob]`: copy every
// media file into the target storage under the same keys, so content keeps
// working unchanged (openspec/changes/make-app-portable, design D3;
// store-media-in-vercel-blob, D5). The source defaults to local disk
// (./uploads, or MEDIA_SOURCE_DIR), the target to $STORAGE: S3 (S3_*) or a
// private Vercel Blob store (BLOB_READ_WRITE_TOKEN). Files already in the
// target are skipped, so it's safe to re-run.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { openStorageKind, storageLabel } from './lib/storage.mjs'

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

// Storage to storage (e.g. an S3 bucket into Blob), page by page.
export async function copyBetween({ source, target, log = () => {} }) {
  const result = { copied: 0, skipped: 0 }
  let cursor
  do {
    const page = await source.list({ cursor, limit: 1000 })
    for (const { key } of page.files) {
      if (await target.exists(key)) {
        result.skipped++
        continue
      }
      const { body, contentType } = await source.download(key)
      await target.upload({ key, body, contentType })
      log(`+ ${key}`)
      result.copied++
    }
    cursor = page.nextCursor
  } while (cursor)
  return result
}

const FROM = ['local', 's3']
const TO = ['s3', 'blob']

export function parseCopyArgs(argv, env = process.env) {
  const value = (flag) => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }
  const from = value('--from') ?? 'local'
  const to = value('--to') ?? env.STORAGE
  if (!FROM.includes(from)) throw new Error(`--from must be ${FROM.join(' or ')}, not "${from}".`)
  if (!TO.includes(to)) throw new Error(`Set --to (or STORAGE) to ${TO.join(' or ')}${to ? `, not "${to}"` : ''}.`)
  if (from === to) throw new Error('--from and --to are the same storage.')
  return { from, to }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { from, to } = parseCopyArgs(process.argv.slice(2))
  const sourceDir = path.resolve(process.env.MEDIA_SOURCE_DIR ?? 'uploads')
  const target = openStorageKind(to)
  const log = (l) => console.log(l)
  const result = from === 'local' ? await copyMedia({ sourceDir, target, log }) : await copyBetween({ source: openStorageKind(from), target, log })
  console.log(`Copied ${result.copied} file(s) to ${storageLabel(to)}; ${result.skipped} already there.`)
}
