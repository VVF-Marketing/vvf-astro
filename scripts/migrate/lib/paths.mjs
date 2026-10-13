import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const MIGRATE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const ROOT_DIR = path.resolve(MIGRATE_DIR, '../..')
export const SNAPSHOT_DIR = path.join(MIGRATE_DIR, 'snapshot')
export const REPORT_PATH = path.join(MIGRATE_DIR, 'report.md')
export const SEED_PATH = path.join(ROOT_DIR, 'seed/seed.json')
export const LOCAL_SEED_PATH = path.join(ROOT_DIR, 'seed/seed.local.json')
export const MEDIA_DIR = path.join(ROOT_DIR, 'seed/media')
export const MANIFEST_PATH = path.join(MEDIA_DIR, 'manifest.json')
export const PUBLIC_IMAGES_DIR = path.join(ROOT_DIR, 'public/images')

export const LIVE_BASE_URL = process.env.LIVE_BASE_URL ?? 'https://www.victoriavenezuelafoundation.org'
