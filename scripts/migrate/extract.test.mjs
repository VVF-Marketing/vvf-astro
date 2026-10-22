import { describe, expect, it } from 'vitest'
import { withEventApiFields } from './extract.mjs'

const api = (slug, description) => ({ fieldData: { slug, description } })

describe('withEventApiFields: long description', () => {
  it('takes the long description from the Webflow API when it was read', () => {
    const out = withEventApiFields([{ slug: 'golf' }], [api('golf', '<p>New</p>')], [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out).toEqual([{ slug: 'golf', descriptionHtml: '<p>New</p>' }])
  })

  it('keeps the snapshot value when the API was not read', () => {
    const out = withEventApiFields([{ slug: 'golf' }], undefined, [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out).toEqual([{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
  })

  it('keeps the snapshot value when the API item has no description', () => {
    const out = withEventApiFields([{ slug: 'golf' }], [api('golf', null)], [{ slug: 'golf', descriptionHtml: '<p>Old</p>' }])
    expect(out[0].descriptionHtml).toBe('<p>Old</p>')
  })

  it('adds nothing when neither source has a description', () => {
    expect(withEventApiFields([{ slug: 'golf' }], [], [])).toEqual([{ slug: 'golf' }])
  })
})

describe('withEventApiFields: card photo', () => {
  const photo = { url: 'https://cdn/card.jpeg', alt: 'Golfers on the green.' }
  const item = (cardPhoto) => ({ fieldData: { slug: 'golf', 'card-photo': cardPhoto } })

  it('takes the card photo and its alt from the Webflow API', () => {
    expect(withEventApiFields([{ slug: 'golf' }], [item(photo)])[0].cardPhoto).toEqual({ src: 'https://cdn/card.jpeg', alt: 'Golfers on the green.' })
  })

  it('drops a kept photo the API now leaves empty', () => {
    const out = withEventApiFields([{ slug: 'golf' }], [item(null)], [{ slug: 'golf', cardPhoto: { src: 'old' } }])
    expect(out[0].cardPhoto).toBeUndefined()
  })

  it('keeps the snapshot photo when the API was not read', () => {
    const out = withEventApiFields([{ slug: 'golf' }], undefined, [{ slug: 'golf', cardPhoto: { src: 'old' } }])
    expect(out[0].cardPhoto).toEqual({ src: 'old' })
  })
})
