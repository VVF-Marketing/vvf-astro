import ChildCard from './ChildCard.astro'

// Fictional child; real children's data never appears in stories (public repo).
const child = { slug: 'sample-child', displayName: 'Sample C.', age: 10 }

export default {
  title: 'Molecules/ChildCard',
  component: ChildCard,
}

export const List = {
  args: { child },
}

export const Compact = {
  args: { child, variant: 'compact' },
}
