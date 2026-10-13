import Card from './Card.astro'

export default {
  title: 'Atoms/Card',
  component: Card,
}

export const White = {
  args: {
    class: 'p-6',
    slots: { default: 'White card (flat, radius 2xl)' },
  },
}

export const Sun = {
  args: {
    tone: 'sun',
    class: 'p-6',
    slots: { default: 'Sun pastel card' },
  },
}

export const Salmon = {
  args: {
    tone: 'salmon',
    class: 'p-6',
    slots: { default: 'Salmon pastel card' },
  },
}

export const Sky = {
  args: {
    tone: 'sky',
    class: 'p-6',
    slots: { default: 'Sky pastel card' },
  },
}

export const OverflowHiddenWithImage = {
  args: {
    overflowHidden: true,
    slots: { default: '<div class="h-32 bg-neutral-light-gray"></div><div class="p-4">Card with clipped image area</div>' },
  },
}
