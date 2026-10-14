// Copy slots for /thank-you-sponsorship (src/lib/copy.ts, src/lib/thankYouCopy.ts).
import { thankYouCopy } from '../../lib/thankYouCopy'

export default thankYouCopy('/thank-you-sponsorship', {
  description: 'Thank you for sponsoring a child in Venezuela. Your receipt and next steps are on their way by email.',
  subtext: 'Your sponsorship is on its way to a child in Venezuela.',
  tagline: 'Your sponsorship at work',
  heading: 'Because of you, this child will receive',
  items: [
    ['Weekly nutritious meals', 'Food that builds strength and hope'],
    ['Dignified access to education', 'Supplies, uniforms, and the tools to learn'],
    ['Medical checkups twice a year', 'A doctor sees your child twice a year, and treatment is covered when something is wrong.'],
    ['Connection with you', 'The knowledge that they matter through a real connection'],
  ],
})
