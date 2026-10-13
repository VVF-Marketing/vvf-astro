#!/usr/bin/env node
// Webflow → EmDash migration CLI. See scripts/migrate/README.md.
//   node scripts/migrate/cli.mjs <step> [--fresh]
import { extract } from './extract.mjs'
import { harvest } from './harvest.mjs'
import { media } from './media.mjs'
import { transform } from './transform.mjs'
import { validate } from './validate.mjs'

const STEPS = {
  extract: ['Crawl the live site into scripts/migrate/snapshot/', extract],
  harvest: ['Download referenced images/PDFs into seed/media/ and public/images/', harvest],
  media: ['Upload seed/media/ into a running local EmDash (EMDASH_URL, default :4321)', media],
  validate: ['Cross-check the snapshot against the Webflow API dump (needs WEBFLOW_API_TOKEN)', validate],
  transform: ['Map the snapshot into seed/seed.json (+ seed/seed.local.json)', transform],
}

const args = process.argv.slice(2)
if (args.includes('--fresh')) process.env.MIGRATE_FRESH = '1'
const step = args.find((a) => !a.startsWith('-'))

if (!step || args.includes('--help') || (step !== 'all' && !STEPS[step])) {
  console.log('Usage: npm run migrate[:<step>] [-- --fresh]\n\nSteps:')
  for (const [name, [desc]] of Object.entries(STEPS)) console.log(`  ${name.padEnd(10)} ${desc}`)
  console.log(`  ${'all'.padEnd(10)} Run extract, harvest, media, transform in order`)
  console.log('\n  --fresh    Bypass the HTTP cache in scripts/migrate/.cache/')
  process.exit(step && step !== 'all' && !STEPS[step] ? 1 : 0)
}

for (const name of step === 'all' ? Object.keys(STEPS).filter((s) => s !== 'validate') : [step]) {
  console.log(`\n▶ ${name}`)
  const result = await STEPS[name][1]()
  if (result) console.log(result)
}
