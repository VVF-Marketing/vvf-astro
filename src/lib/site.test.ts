import { describe, expect, it } from 'vitest'
import { sameSitePath } from './site.mjs'

describe('sameSitePath', () => {
  it.each([
    ['https://www.victoriavenezuelafoundation.org/events', '/events'],
    ['https://victoriavenezuelafoundation.org', '/'],
    ['HTTP://VictoriaVenezuelaFoundation.org/es?x=1', '/es?x=1'],
    ['//victoriavenezuelafoundation.org#top', '/#top'],
  ])('%s -> %s', (url, path) => {
    expect(sameSitePath(url)).toBe(path)
  })

  it.each(['/events', 'https://donorbox.org/x', 'https://victoriavenezuelafoundation.org.evil.example/', 'mailto:info@victoriavenezuelafoundation.org'])(
    'ignores %s',
    (url) => {
      expect(sameSitePath(url)).toBeUndefined()
    }
  )
})
