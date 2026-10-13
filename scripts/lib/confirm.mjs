// Confirmation before a script destroys local data (review finding on PR #12:
// `npm run seed` deleted the local database without asking).
//
// Proceeds without asking with --yes or in CI. In a terminal, asks; anywhere
// else (no terminal to ask in) it refuses, so an unattended run can't wipe a
// database by accident.
import { createInterface } from 'node:readline/promises'

export async function confirmDestructive(message, { argv = process.argv, env = process.env, stdin = process.stdin, stdout = process.stdout, ask } = {}) {
  if (argv.includes('--yes') || env.CI) return true
  if (!ask) {
    if (!stdin.isTTY) {
      console.error(`${message}\nRefusing without a terminal to confirm in: re-run with --yes (e.g. npm run seed -- --yes).`)
      return false
    }
    ask = async (q) => {
      const rl = createInterface({ input: stdin, output: stdout })
      try {
        return await rl.question(q)
      } finally {
        rl.close()
      }
    }
  }
  return /^y(es)?$/i.test((await ask(`${message}\nContinue? [y/N] `)).trim())
}
