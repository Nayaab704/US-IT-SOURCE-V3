import { contactParams } from '~/data/contact'
import { projectsParams } from '~/data/projects'
import { servicesParams } from '~/data/services'

/**
 * The site menu (F4): open state shared by the pill nav and the menu, and the sections' scroll
 * targets. A target is where its section is "settled" (the title formed, the first chapter in, the
 * headline written), not its raw top — pinned sections start in the middle of a transition.
 */
export type MenuKey = 'home' | 'projects' | 'services' | 'contact'

export const MENU_LINKS: { key: MenuKey; label: string; still: string }[] = [
  { key: 'home', label: 'Home', still: '/media/menu/home.webp' },
  { key: 'projects', label: 'Projects', still: '/media/menu/projects.webp' },
  { key: 'services', label: 'Services', still: '/media/menu/services.webp' },
  { key: 'contact', label: 'Contact', still: '/media/menu/contact.webp' },
]

/** Top of a pinned section's spacer (document px), or of the element itself. */
function pinTop(selector: string) {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const box = el.closest('.pin-spacer') ?? el
  return box.getBoundingClientRect().top + window.scrollY
}

export function menuTarget(key: MenuKey): number | null {
  if (!import.meta.client) return null
  const vh = window.innerHeight
  const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  switch (key) {
    case 'home':
      return 0
    case 'projects': {
      const top = pinTop('.pj')
      if (top === null) return null
      const P = projectsParams.pin
      return top + (mobile ? P.emergeMobile + P.toTitleMobile : P.emerge + P.toTitle) * vh
    }
    case 'services': {
      if (document.querySelector('.svm')) return pinTop('.svm')
      const top = pinTop('.sv')
      return top === null ? null : top + (servicesParams.pin.intro + servicesParams.pin.transition) * vh
    }
    case 'contact': {
      const top = pinTop('.ct-scene')
      if (top === null) return null
      const k = mobile ? contactParams.pin.mobileScale : 1
      return top + (contactParams.pin.rects + contactParams.pin.write) * k * vh
    }
  }
}

export function useMenu() {
  const open = useState('menu-open', () => false)
  const { scrollTo } = useLenis()
  /** Scroll to a section's settled point (smooth unless `immediate`). */
  function goTo(key: MenuKey, immediate = false) {
    const y = menuTarget(key)
    if (y === null) return
    // force: Lenis is stopped while the menu is open; the jump must happen under the card anyway.
    scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.4 })
  }
  return { open, goTo }
}
