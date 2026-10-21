import { describe, expect, it } from 'vitest'
import { withEventDescriptions } from './extract.mjs'

const api = (slug, description) => ({ fieldData: { slug, description } })

describe('withEventDescriptions', () => {
  it('takes the long description from the Webflow API when it was read', () => {
    const out = withEventDescriptions([{ slug: 'golf' }], [api('golf', '<p>New</p>')], [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out).toEqual([{ slug: 'golf', descriptionHtml: '<p>New</p>' }])
  })

  it('keeps the snapshot value when the API was not read', () => {
    const out = withEventDescriptions([{ slug: 'golf' }], undefined, [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out).toEqual([{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
  })

  it('keeps the snapshot value when the API item has no description', () => {
    const out = withEventDescriptions([{ slug: 'golf' }], [api('golf', null)], [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out[0].descriptionHtml).toBe('<p>Old</p>')
  })

  it('adds nothing when neither source has a description', () => {
    expect(withEventDescriptions([{ slug: 'golf' }], [], [])).toEqual([{ slug: 'golf' }])
  })
})
