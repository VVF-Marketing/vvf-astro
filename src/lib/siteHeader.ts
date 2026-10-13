// Header behavior: keyboard-operable dropdowns (desktop) and the mobile menu
// toggle. Dropdowns also open on hover via CSS (`group-hover`); this adds
// click/keyboard opening with `aria-expanded` kept in sync.

function setOpen(dropdown: HTMLElement, open: boolean) {
  dropdown.classList.toggle('is-open', open)
  dropdown.querySelector('[data-dropdown-toggle]')?.setAttribute('aria-expanded', String(open))
}

function menuLinks(dropdown: HTMLElement): HTMLAnchorElement[] {
  return Array.from(dropdown.querySelectorAll<HTMLAnchorElement>('[data-dropdown-menu] a'))
}

export function initSiteHeader(header: HTMLElement) {
  const dropdowns = Array.from(header.querySelectorAll<HTMLElement>('[data-dropdown]'))
  const closeAll = (except?: HTMLElement) => dropdowns.forEach((d) => d !== except && setOpen(d, false))

  for (const dropdown of dropdowns) {
    const toggle = dropdown.querySelector<HTMLButtonElement>('[data-dropdown-toggle]')
    if (!toggle) continue

    toggle.addEventListener('click', () => {
      const open = !dropdown.classList.contains('is-open')
      closeAll(dropdown)
      setOpen(dropdown, open)
    })

    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return
      event.preventDefault()
      // Don't let the menu's own ArrowDown handler also move focus.
      event.stopPropagation()
      closeAll(dropdown)
      setOpen(dropdown, true)
      menuLinks(dropdown)[0]?.focus()
    })

    dropdown.addEventListener('keydown', (event) => {
      const links = menuLinks(dropdown)
      const index = links.indexOf(document.activeElement as HTMLAnchorElement)
      if (event.key === 'Escape') {
        setOpen(dropdown, false)
        toggle.focus()
      } else if (event.key === 'ArrowDown' && index >= 0) {
        event.preventDefault()
        links[(index + 1) % links.length]?.focus()
      } else if (event.key === 'ArrowUp' && index >= 0) {
        event.preventDefault()
        if (index === 0) toggle.focus()
        else links[index - 1]?.focus()
      }
    })

    dropdown.addEventListener('focusout', (event) => {
      if (!dropdown.contains(event.relatedTarget as Node | null)) setOpen(dropdown, false)
    })
  }

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target as Node)) closeAll()
  })

  const mobileToggle = header.querySelector<HTMLButtonElement>('[data-mobile-menu-toggle]')
  const mobileMenu = header.querySelector<HTMLElement>('[data-mobile-menu]')
  mobileToggle?.addEventListener('click', () => {
    const open = mobileMenu?.classList.contains('hidden') ?? false
    mobileMenu?.classList.toggle('hidden', !open)
    mobileToggle.setAttribute('aria-expanded', String(open))
  })
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileToggle?.getAttribute('aria-expanded') === 'true') {
      mobileMenu?.classList.add('hidden')
      mobileToggle.setAttribute('aria-expanded', 'false')
      mobileToggle.focus()
    }
  })
}
