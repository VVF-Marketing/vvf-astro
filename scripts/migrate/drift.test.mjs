import { describe, expect, it } from 'vitest'
import { buildCorpus, contains, missingStrings, normalize, pageStrings } from './drift.mjs'

describe('normalize', () => {
  it('ignores curly quotes, dashes, spacing and case', () => {
    expect(normalize('Transform a child’s  life — Today')).toBe(normalize("transform a child's life - today"))
  })
})

describe('contains', () => {
  const corpus = buildCorpus(["'hero.heading': { default: 'Transform a child\\'s life in Venezuela' }", '<li><strong>Weekly meals:</strong> Food that builds strength</li>'])

  it('finds a string written with other quotes or split over elements', () => {
    expect(contains(corpus, 'Transform a child’s life in Venezuela')).toBe(true)
    expect(contains(corpus, 'Weekly meals:Food that builds strength')).toBe(true)
  })

  it('does not find a string the build lacks', () => {
    expect(contains(corpus, 'Multiple ways to reach us')).toBe(false)
  })
})

describe('missingStrings', () => {
  const page = {
    path: '/contact',
    seo: { title: 'Contact | Victoria Venezuela Foundation', description: 'Write to us.' },
    sections: [
      {
        blocks: [
          { type: 'h2', text: 'Multiple ways to reach us' },
          { type: 'h2', text: 'Multiple ways to reach us' },
          { type: 'image', alt: 'A girl holding cotton candy.' },
          { type: 'p', text: 'ok' },
          { type: 'cta', text: 'Donate', href: '/ways-to-give' },
        ],
      },
    ],
  }

  it('compares the SEO title without its brand suffix, and skips very short text', () => {
    expect(pageStrings(page).map((s) => s.text)).toEqual(['Contact', 'Write to us.', 'Multiple ways to reach us', 'Multiple ways to reach us', 'A girl holding cotton candy.', 'Donate'])
  })

  it('lists each missing string once', () => {
    const corpus = buildCorpus(['Contact', 'Write to us.', 'Donate', 'A girl holding cotton candy.'])
    expect(missingStrings(page, corpus)).toEqual([{ kind: 'h2', text: 'Multiple ways to reach us', href: undefined }])
  })
})
