// Copy slots for /thank-you-earthquake-relief (src/lib/copy.ts, src/lib/thankYouCopy.ts).
import { thankYouCopy } from '../../lib/thankYouCopy'

export default thankYouCopy('/thank-you-earthquake-relief', {
  description: 'Thank you for your gift to families displaced by the earthquakes in Venezuela. Your receipt and next steps are on their way by email.',
  subtext: 'Your gift is on its way to families displaced by the earthquakes.',
  tagline: 'Your gift at work',
  heading: 'Because of you, displaced families will receive',
  items: [
    ['Shelter', 'A safe place to stay for families whose homes were destroyed'],
    ['Medical care', 'Check-ups, medicine and treatment for children and their families'],
    ['Daily meals', 'Nutrition for the children staying at the centre in La Guaira'],
    ['Clean water and supplies', 'Food, water and medical supplies delivered where they are needed'],
  ],
})
