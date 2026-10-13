import { describe, expect, it } from 'vitest'
import { MANUAL_TRANSLATIONS, withManualTranslations } from './pagecopy.mjs'

describe('withManualTranslations', () => {
  it('adds manual Spanish for slots the live site lacks, without dropping aligned ones', () => {
    const aligned = { _global: { 'footer.privacy': 'Política de privacidad' }, '/contact': { 'hero.heading': 'Contáctanos' } }
    const out = withManualTranslations(aligned)
    expect(out._global).toEqual({ 'footer.privacy': 'Política de privacidad', 'a11y.newTab': '(se abre en una pestaña nueva)' })
    expect(out['/contact']).toEqual(aligned['/contact'])
    expect(aligned._global['a11y.newTab']).toBeUndefined()
  })

  it('wins over an aligned value for the same slot', () => {
    expect(withManualTranslations({ _global: { 'a11y.newTab': 'otra cosa' } })._global['a11y.newTab']).toBe(MANUAL_TRANSLATIONS._global['a11y.newTab'])
  })
})
