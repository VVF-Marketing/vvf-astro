import ChildProfile from './ChildProfile.astro'
import DonationAmountWidget from './DonationAmountWidget.astro'
import type { ChildItem } from '../lib/content/types'

// Fictional child; real children's data never appears in stories (public repo).
const maria: ChildItem = {
  slug: 'maria',
  displayName: 'Maria S.',
  age: 8,
  birthday: '2018-03-14',
  gender: 'Female',
  dream: 'She wants to be a teacher when she grows up.',
  about: 'Maria lives with her grandmother and two cousins and loves drawing.',
  published: true,
  donorboxSponsorshipRef: 'maria-sponsorship',
}

export default {
  title: 'Organisms/ChildProfile',
  component: ChildProfile,
}

// ChildProfile renders its "donation" slot as an empty column when unset —
// every story here supplies one so the layout matches the real page.
export const Default = {
  args: {
    child: maria,
    slots: {
      donation: {
        component: DonationAmountWidget,
        props: {
          actionUrl: 'https://donorbox.org/embed/make-a-difference-55',
          sponsorTargetLabel: maria.displayName,
        },
      },
    },
  },
}

export const MinimalData = {
  args: {
    child: { slug: 'jose', displayName: 'Jose', age: 5, published: true },
    slots: {
      donation: {
        component: DonationAmountWidget,
        props: { actionUrl: 'https://donorbox.org/embed/make-a-difference-55' },
      },
    },
  },
}
