import { gsap } from 'gsap'

/**
 * The rectangle rule between pages (ART_DIRECTION §3): the clicked element's rectangle grows into the
 * next page. A paper-coloured layer (attached to <body>, so it survives the route change) grows from
 * the element's rect to full screen, the route changes underneath it, the new page starts at the top,
 * and the layer fades away. Reduced motion: a plain navigation.
 */
let busy = false

export function useRectTransition() {
  const reduced = useReducedMotion()
  const { scrollTo } = useLenis()

  async function go(path: string, from?: Element | null) {
    if (busy) return
    if (reduced.value || !import.meta.client) {
      await navigateTo(path)
      return
    }
    busy = true
    const r = from?.getBoundingClientRect() ?? { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
    const layer = document.createElement('div')
    layer.setAttribute('aria-hidden', 'true')
    Object.assign(layer.style, {
      position: 'fixed',
      zIndex: '950',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      borderRadius: '12px',
      background: '#f1eee7',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>)
    document.body.appendChild(layer)
    try {
      await gsap.to(layer, {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        borderRadius: 0,
        duration: 0.6,
        ease: 'power3.inOut',
      })
      await navigateTo(path)
      scrollTo(0, { immediate: true, force: true })
      // Let the new page paint under the layer before revealing it.
      await new Promise((res) => setTimeout(res, 120))
      await gsap.to(layer, { opacity: 0, duration: 0.45, ease: 'power1.out' })
    } finally {
      layer.remove()
      busy = false
    }
  }

  return { go }
}
