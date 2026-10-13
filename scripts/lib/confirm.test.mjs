import { describe, expect, it } from 'vitest'
import { confirmDestructive } from './confirm.mjs'

const tty = { isTTY: true }
const noTty = { isTTY: false }

describe('confirmDestructive', () => {
  it('proceeds with --yes or in CI', async () => {
    expect(await confirmDestructive('x', { argv: ['node', 's', '--yes'], env: {}, stdin: noTty })).toBe(true)
    expect(await confirmDestructive('x', { argv: [], env: { CI: 'true' }, stdin: noTty })).toBe(true)
  })

  it('asks in a terminal', async () => {
    expect(await confirmDestructive('x', { argv: [], env: {}, stdin: tty, ask: async () => 'y' })).toBe(true)
    expect(await confirmDestructive('x', { argv: [], env: {}, stdin: tty, ask: async () => '' })).toBe(false)
  })

  it('refuses without a terminal', async () => {
    expect(await confirmDestructive('x', { argv: [], env: {}, stdin: noTty })).toBe(false)
  })
})
