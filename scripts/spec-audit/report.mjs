// Spec conformance report: joins the check registry (e2e/spec-audit/registry.ts)
// with the audit results and writes .spec-audit/report.md (gitignored; the
// spec is confidential). Run after `npm run test:spec-audit`:
//   npm run spec-audit:report
//
// Inputs, all in .spec-audit/:
//   results.json         Playwright JSON reporter output
//   vitest-results.json  Vitest JSON reporter output
//   manual.json          { "<id>": { "status": "pass" | "fail" | "pending", "note": "..." } }
//   answers.json         { "Q1": { "choice": "A", "date": "2026-10-13" } } (answered Step 1 questions)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CHECKS, SPEC_VERSION } from '../../e2e/spec-audit/registry.ts'

const dir = fileURLToPath(new URL('../../.spec-audit/', import.meta.url))
const readJson = (name, fallback) => (existsSync(dir + name) ? JSON.parse(readFileSync(dir + name, 'utf8')) : fallback)

const ID = /^\[(\d+\.\d+-\d+)\]\s*(en|es)?/

/** @returns {{ id: string, lang?: string, title: string, status: 'passed'|'failed'|'skipped', error?: string }[]} */
function playwrightTests(report) {
  const out = []
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const m = spec.title.match(ID)
      if (!m) continue
      for (const t of spec.tests ?? []) {
        const r = t.results?.at(-1)
        const status = t.status === 'skipped' || r?.status === 'skipped' ? 'skipped' : r?.status === 'passed' ? 'passed' : 'failed'
        const skipReason = t.annotations?.find((a) => a.type === 'skip')?.description
        out.push({ id: m[1], lang: m[2], title: spec.title, status, error: status === 'failed' ? r?.error?.message : skipReason })
      }
    }
    for (const s of suite.suites ?? []) walk(s)
  }
  for (const s of report?.suites ?? []) walk(s)
  return out
}

function vitestTests(report) {
  const out = []
  for (const file of report?.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      const m = [...(a.ancestorTitles ?? []), a.title].join(' ').match(/\[(\d+\.\d+-\d+)\]/)
      if (!m) continue
      const status = a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped'
      out.push({ id: m[1], title: a.fullName, status, error: a.failureMessages?.[0] })
    }
  }
  return out
}

const firstLine = (s = '') =>
  s
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(Error: )?expect\(/.test(l) && !/^at /.test(l))
    .slice(0, 3)
    .join(' · ')
    .slice(0, 240)

const tests = [...playwrightTests(readJson('results.json')), ...vitestTests(readJson('vitest-results.json'))]
const manual = readJson('manual.json', {})
const answers = readJson('answers.json', {})
const isOpen = (q) => q && !answers[q]

const rows = CHECKS.map((c) => {
  const mine = tests.filter((t) => t.id === c.id)
  let status
  let detail = ''
  let langs = ''
  if (c.verify === 'blocked') {
    status = 'blocked'
    detail = [c.reason, c.question && `waits on ${c.question}`].filter(Boolean).join(' ')
  } else if (c.verify === 'manual') {
    const m = manual[c.id]
    status = m?.status === 'pass' ? 'pass' : m?.status === 'fail' ? 'fail' : 'manual-pending'
    detail = m?.note ?? c.steps ?? ''
  } else if (mine.length === 0) {
    status = 'blocked'
    detail = 'no result: the test did not run'
  } else {
    const failed = mine.filter((t) => t.status === 'failed')
    const passed = mine.filter((t) => t.status === 'passed')
    if (failed.length) {
      status = 'fail'
      langs = [...new Set(failed.map((t) => t.lang).filter(Boolean))].join('+')
      detail = [...new Set(failed.map((t) => `${t.title.replace(ID, '').replace(/@\w+/g, '').trim()}: ${firstLine(t.error)}`))].slice(0, 3).join(' | ')
    } else if (passed.length) status = 'pass'
    else {
      status = 'blocked'
      detail = mine.find((t) => t.error)?.error ?? 'skipped'
    }
  }
  // A failure that depends on an unanswered question is blocked, not failed.
  if (status === 'fail' && isOpen(c.question)) {
    status = 'blocked'
    detail = `waits on ${c.question} · ${detail}`
  }
  return { ...c, status, detail, langs }
})

const section = (id) => id.split('-')[0]
const STATUSES = ['pass', 'fail', 'blocked', 'manual-pending']
const count = (rs) => Object.fromEntries(STATUSES.map((s) => [s, rs.filter((r) => r.status === s).length]))

let commit = 'unknown'
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {}

const esc = (s = '') => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const lines = []
const total = count(rows)
lines.push(`# Spec conformance report`, '')
lines.push(`Spec v${SPEC_VERSION} · commit ${commit} · ${new Date().toISOString().slice(0, 10)} · ${rows.length} checks`, '')
lines.push(`**Totals:** ${STATUSES.map((s) => `${s} ${total[s]}`).join(' · ')}`, '')
lines.push('| Section | Pass | Fail | Blocked | Manual pending |', '| --- | --- | --- | --- | --- |')
for (const s of [...new Set(rows.map((r) => section(r.id)))]) {
  const c = count(rows.filter((r) => section(r.id) === s))
  lines.push(`| ${s} | ${c.pass} | ${c.fail} | ${c.blocked} | ${c['manual-pending']} |`)
}
lines.push('', '## Failures', '', '| Check | What | Lang | Triage | Batch | What the build does instead |', '| --- | --- | --- | --- | --- | --- |')
for (const r of rows.filter((r) => r.status === 'fail')) {
  const [sec, n] = r.id.split('-')
  lines.push(`| ${sec}, check ${n} | ${esc(r.label)} | ${r.langs || '–'} | ${r.triage ?? '?'} | ${r.batch ?? '?'} | ${esc(r.detail)} |`)
}
const BATCHES = {
  A: 'Routing and indexing',
  B: 'Design system and shared parts',
  C: 'Content model',
  D: 'Pages',
  E: 'Integrations and content rules',
  F: 'Decided items',
}
lines.push('', '## Fix batches', '', '| Batch | Fails it turns green |', '| --- | --- |')
for (const [b, name] of Object.entries(BATCHES)) {
  const ids = rows.filter((r) => r.status === 'fail' && r.batch === b && r.triage === 'straightforward').map((r) => r.id)
  if (ids.length) lines.push(`| ${b}. ${name} | ${ids.join(', ')} |`)
}
const decisions = rows.filter((r) => r.status !== 'pass' && (r.triage === 'decision' || (r.question && isOpen(r.question))))
lines.push('', `Waiting on a decision: ${decisions.map((r) => `${r.id} (${r.question ?? 'no question'})`).join(', ') || 'none'}`)
lines.push('', '## Blocked and manual', '', '| Check | What | Status | Why |', '| --- | --- | --- | --- |')
for (const r of rows.filter((r) => r.status === 'blocked' || r.status === 'manual-pending')) {
  const [sec, n] = r.id.split('-')
  lines.push(`| ${sec}, check ${n} | ${esc(r.label)} | ${r.status} | ${esc(r.detail)} |`)
}
lines.push('', '## Passing', '', rows.filter((r) => r.status === 'pass').map((r) => r.id).join(', ') || 'none')

writeFileSync(dir + 'report.md', lines.join('\n') + '\n')
writeFileSync(dir + 'report.json', JSON.stringify(rows, null, 2))
console.log(`report: ${STATUSES.map((s) => `${s} ${total[s]}`).join(', ')} (${rows.length} checks) -> .spec-audit/report.md`)
