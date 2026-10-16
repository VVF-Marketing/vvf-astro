// Swipe rows (spec 5.5): a horizontal scroll-snap track with one dot per
// slide and mouse drag. A drag moves one slide and never follows a link or
// opens a card. Markup: [data-swipe] > [data-track] > slides, and an optional
// [data-dots] holding one [data-dot] button per slide (rendered by the page,
// so the count is right before any script runs).

const DRAG_THRESHOLD = 6

function slideLeft(track: HTMLElement, slide: HTMLElement): number {
  return slide.offsetLeft - track.offsetLeft - (parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0)
}

function nearest(track: HTMLElement, slides: HTMLElement[]): number {
  let best = 0
  let gap = Infinity
  slides.forEach((s, i) => {
    const d = Math.abs(slideLeft(track, s) - track.scrollLeft)
    if (d < gap) [best, gap] = [i, d]
  })
  return best
}

export function initSwipe(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-track]')
  if (!track || track.dataset.swipeReady) return
  track.dataset.swipeReady = 'true'
  const slides = Array.from(track.children) as HTMLElement[]
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-dot]'))
  const go = (i: number) => {
    const index = Math.max(0, Math.min(slides.length - 1, i))
    track.scrollTo({ left: slideLeft(track, slides[index]), behavior: 'smooth' })
  }

  // Dots follow the scroll position; pressing one goes to its slide.
  const sync = () => {
    const current = nearest(track, slides)
    dots.forEach((d, i) => d.setAttribute('aria-current', i === current ? 'true' : 'false'))
  }
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)))
  track.addEventListener('scroll', () => window.requestAnimationFrame(sync), { passive: true })
  sync()

  // Mouse drag: follow the pointer, then settle one slide over.
  let startX: number | undefined
  let startLeft = 0
  let startIndex = 0
  let dragged = false
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    startX = e.clientX
    startLeft = track.scrollLeft
    startIndex = nearest(track, slides)
    dragged = false
  })
  track.addEventListener('pointermove', (e) => {
    if (startX === undefined) return
    const dx = e.clientX - startX
    if (!dragged && Math.abs(dx) < DRAG_THRESHOLD) return
    if (!dragged) {
      dragged = true
      track.setPointerCapture(e.pointerId)
      track.style.scrollSnapType = 'none'
      track.style.scrollBehavior = 'auto'
    }
    track.scrollLeft = startLeft - dx
  })
  const end = (e: PointerEvent) => {
    if (startX === undefined) return
    const dx = e.clientX - startX
    startX = undefined
    if (!dragged) return
    track.style.scrollSnapType = ''
    track.style.scrollBehavior = ''
    go(startIndex + (dx < 0 ? 1 : -1))
  }
  track.addEventListener('pointerup', end)
  track.addEventListener('pointercancel', end)
  // The click that ends a drag doesn't open what's under the pointer.
  track.addEventListener(
    'click',
    (e) => {
      if (!dragged) return
      e.preventDefault()
      e.stopPropagation()
      dragged = false
    },
    true
  )
  track.addEventListener('dragstart', (e) => e.preventDefault())
}

export function initSwipes(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>('[data-swipe]').forEach(initSwipe)
}
