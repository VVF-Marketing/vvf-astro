// Step 3: harvested SVGs → public/images/media/.
//
// EmDash's media library rejects SVG uploads, so SVGs (sponsor logos) are
// served as static files and referenced as external media. Every other
// harvested file is seeded with a stable media value
// (scripts/lib/seed-media.mjs): transform.mjs writes the values and
// `npm run seed` / `npm run db:setup` upload the files. No running EmDash is
// needed.
import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { isSeedMedia, isSvg, readManifests } from '../lib/seed-media.mjs'
import { ROOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'

const STATIC_MEDIA_DIR = 'public/images/media'

export function copyStaticMedia({
  manifest = readManifests().all,
  copy = (rel) => {
    const dest = path.join(ROOT_DIR, STATIC_MEDIA_DIR, path.basename(rel))
    mkdirSync(path.dirname(dest), { recursive: true })
    copyFileSync(path.join(ROOT_DIR, rel), dest)
  },
} = {}) {
  const entries = Object.values(manifest).filter(isSeedMedia)
  const svgs = [...new Set(entries.filter(isSvg).map((e) => e.path))]
  for (const rel of svgs) copy(rel)
  return { staticFiles: svgs.length, seeded: new Set(entries.filter((e) => !isSvg(e)).map((e) => e.path)).size }
}

export async function media() {
  const report = createSection('Media')
  const result = copyStaticMedia()
  report.line(`- SVGs served from \`public/images/media/\` (EmDash rejects SVG uploads): ${result.staticFiles}.`)
  report.line(`- Files seeded into EmDash's media library by \`npm run seed\` / \`npm run db:setup\`: ${result.seeded}.`)
  report.write()
  return result
}
