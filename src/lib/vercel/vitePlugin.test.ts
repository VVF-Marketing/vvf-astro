import { describe, expect, it } from 'vitest'
import { vercelRuntime } from './vitePlugin.mjs'

describe('vercelRuntime', () => {
  const plugin = vercelRuntime()
  const load = (id: string) => plugin.load(plugin.resolveId(id) as string)

  it('runs before EmDash resolves its virtual modules', () => {
    expect(plugin.enforce).toBe('pre')
  })

  it('turns off the in-process scheduler', () => {
    expect(load('virtual:emdash/scheduler')).toContain('export const createScheduler = null')
  })

  it("hands deferred work to Vercel's waitUntil", () => {
    expect(load('virtual:emdash/wait-until')).toContain("export { waitUntil } from '@vercel/functions'")
  })

  it('leaves every other module to Vite and EmDash', () => {
    expect(plugin.resolveId('virtual:emdash/config')).toBeNull()
    expect(plugin.resolveId('./x.mjs')).toBeNull()
    expect(plugin.load('/src/x.mjs')).toBeNull()
  })
})
