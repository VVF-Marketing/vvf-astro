import ChildCarousel from './ChildCarousel.astro'

// Fictional children; real children's data never appears in stories (public repo).
const items = ['Sample A.', 'Sample B.', 'Sample C.', 'Sample D.', 'Sample E.', 'Sample F.', 'Sample G.'].map((displayName, i) => ({
  slug: `sample-${i}`,
  displayName,
  age: 6 + i,
}))

export default {
  title: 'Organisms/ChildCarousel',
  component: ChildCarousel,
}

export const Default = {
  args: { items },
}
