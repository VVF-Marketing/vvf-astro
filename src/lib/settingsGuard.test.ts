import { describe, expect, it, vi } from 'vitest'
import { createSettingsGuard } from './settingsGuard'

const postgres = { DB_ADAPTER: 'postgres', STORAGE: 'local' }

describe('createSettingsGuard', () => {
  it('lets every request through when nothing is missing', () => {
    const guard = createSettingsGuard({ env: { DATABASE_URL: 'postgres://x' }, mode: postgres, log: vi.fn() })
    expect(guard('/')).toBeNull()
  })

  it('answers 503 and logs the missing name once', async () => {
    const log = vi.fn()
    const guard = createSettingsGuard({ env: {}, mode: postgres, log })
    const response = guard('/contact')
    expect(response?.status).toBe(503)
    expect(response?.headers.get('Cache-Control')).toBe('no-store')
    expect(await response?.text()).not.toContain('DATABASE_URL')
    guard('/es')
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('DATABASE_URL')
  })

  it('keeps /healthz up, and /readyz down', () => {
    const guard = createSettingsGuard({ env: {}, mode: postgres, log: vi.fn() })
    expect(guard('/healthz')).toBeNull()
    expect(guard('/readyz')?.status).toBe(503)
  })

  it("uses the build's mode, not the runtime's", () => {
    const guard = createSettingsGuard({ env: { DB_ADAPTER: 'sqlite' }, mode: postgres, log: vi.fn() })
    expect(guard('/')?.status).toBe(503)
  })
})
