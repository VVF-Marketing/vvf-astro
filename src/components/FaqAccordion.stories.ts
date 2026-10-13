import { expect } from 'storybook/test'
import FaqAccordion from './FaqAccordion.astro'
import type { Faq } from '../lib/content/types'

// Live Sponsor a Child FAQs.
const faqs: Faq[] = [
  {
    question: 'How much does sponsorship cost?',
    answer:
      'Sponsorship starts at $25 per month. You choose the amount that fits your budget. Your gifts fund the meals, medical care and education programs that reach every child in our care. In fiscal 2025, 95% of funds went directly to programs.',
    category: 'sponsorship',
  },
  {
    question: 'Where does my money go?',
    answer:
      'Your sponsorship funds provide weekly meals, medical checkups twice a year, school supplies and uniforms, and faith-based teaching. We maintain complete transparency about how every dollar is spent. You can review our detailed financials anytime on our website.',
    category: 'sponsorship',
  },
  {
    question: 'Can I write to my sponsored child?',
    answer:
      'Yes. Your child will receive your letters and drawings, and they will write back to you. This connection is one of the most meaningful parts of sponsorship.',
    category: 'sponsorship',
  },
]

export default {
  title: 'Molecules/FaqAccordion',
  component: FaqAccordion,
}

export const Default = {
  args: { faqs },
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector('details') as HTMLDetailsElement
    const summary = details.querySelector('summary') as HTMLElement

    expect(details.open).toBe(false)

    summary.click()
    expect(details.open).toBe(true)

    summary.click()
    expect(details.open).toBe(false)
  },
}
