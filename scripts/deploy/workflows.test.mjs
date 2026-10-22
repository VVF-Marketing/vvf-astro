// The deploy workflows' safety rules (openspec/changes/add-vercel-deploy-pipeline,
// D0): one Vercel team means the token reaches production, so pull-request
// code must never run where a deploy credential is. These checks fail if a
// later edit breaks that.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const workflow = (name) => {
  const text = readFileSync(path.join(ROOT, '.github/workflows', name), 'utf8')
  return { text, doc: parse(text) }
}
const DEPLOY_CREDENTIALS = /secrets\.(VERCEL_TOKEN|NEON_PREVIEW_API_KEY)\b/
const usesPrCode = (step) =>
  (step.uses?.startsWith('actions/checkout') && /head_sha|head\.sha|head\.ref/.test(JSON.stringify(step.with ?? {}))) || /npm (ci|install)\b(?!.*--global)/.test(step.run ?? '') && step['working-directory'] === 'pr'

describe('deploy workflows', () => {
  it('builds pull requests with no secrets at all', () => {
    const { text, doc } = workflow('preview-build.yml')
    expect(Object.keys(doc.on)).toEqual(['pull_request'])
    expect(text).not.toMatch(/secrets\./)
    expect(text).not.toMatch(/environment:/)
    expect(doc.permissions).toEqual({ contents: 'read' })
  })

  it('runs deploys only from triggers that use main\'s definition', () => {
    const { doc } = workflow('deploy.yml')
    expect(Object.keys(doc.on).sort()).toEqual(['pull_request_target', 'workflow_run'])
  })

  it('never deploys a preview to production', () => {
    const { text } = workflow('deploy.yml')
    expect(text).not.toMatch(/vercel[^\n]*\s--prod\b/)
  })

  it("runs the pull request's code only after the last step holding a deploy credential", () => {
    const { doc } = workflow('deploy.yml')
    for (const [name, job] of Object.entries(doc.jobs)) {
      const steps = job.steps
      const lastCredential = steps.map((s) => DEPLOY_CREDENTIALS.test(JSON.stringify(s))).lastIndexOf(true)
      const firstPrCode = steps.findIndex(usesPrCode)
      if (firstPrCode !== -1) expect(firstPrCode, `${name}: PR code before a credential step`).toBeGreaterThan(lastCredential)
      // And a job that runs PR code after credentials hands its later steps nothing secret.
      for (const step of steps.slice(Math.max(firstPrCode, 0))) if (firstPrCode !== -1) expect(DEPLOY_CREDENTIALS.test(JSON.stringify(step)), `${name}: ${step.name ?? step.uses}`).toBe(false)
    }
  })

  it('runs migrations with only the branch database URLs', () => {
    const { doc } = workflow('deploy.yml')
    const migrate = doc.jobs['preview-deploy'].steps.find((s) => /db:setup/.test(s.run ?? ''))
    expect(migrate.env).toBeUndefined()
    expect(migrate.run).toMatch(/env -i /)
  })

  it('never checks out the pull request in cleanup', () => {
    const { doc } = workflow('deploy.yml')
    const cleanup = doc.jobs['preview-cleanup']
    expect(cleanup.if).toMatch(/pull_request_target/)
    expect(cleanup.steps.some(usesPrCode)).toBe(false)
    expect(JSON.stringify(cleanup.steps)).not.toMatch(/head\.sha|head_sha|head\.ref/)
  })

  it('keeps every checkout from leaving the job token on disk', () => {
    for (const name of ['deploy.yml', 'preview-build.yml']) {
      for (const job of Object.values(workflow(name).doc.jobs)) {
        for (const step of job.steps.filter((s) => s.uses?.startsWith('actions/checkout'))) expect(step.with?.['persist-credentials'], name).toBe(false)
      }
    }
  })
})
