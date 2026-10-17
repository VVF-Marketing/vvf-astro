// Copy slots for /thank-you-donation (src/lib/copy.ts, src/lib/thankYouCopy.ts).
import { thankYouCopy } from '../../lib/thankYouCopy'

export default thankYouCopy('/thank-you-donation', {
  description: 'Thank you for your gift to children in Venezuela. Your receipt and next steps are on their way by email.',
  subtext: 'Your gift is on its way to children in Venezuela.',
  tagline: 'Your gift at work',
  heading: 'Because of you, children will receive',
  items: [
    ['Weekly nutritious meals', 'Food that builds strength and hope'],
    ['Dignified access to education', 'Supplies, uniforms, and the tools to learn'],
    ['Medical checkups twice a year', 'A doctor sees each child twice a year, and treatment is covered when something is wrong.'],
    ['A safe place to grow', 'Shelter, nutrition and care at our support centres'],
  ],
})
