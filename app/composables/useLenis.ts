import type Lenis from 'lenis'
import type { ScrollToOptions as LenisScrollToOptions } from 'lenis'

type ScrollTarget = number | string | HTMLElement

// Set by plugins/lenis.client.ts. Null when reduced motion is on (native scroll) or on the server.
const instance = shallowRef<Lenis | null>(null)

/** Internal: only the Lenis plugin should call this. */
export function setLenisInstance(lenis: Lenis | null) {
  instance.value = lenis
}

function nativeScrollTo(target: ScrollTarget, offset = 0) {
  if (typeof target === 'number') {
    window.scrollTo({ top: target + offset })
    return
  }
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset })
}

export function useLenis() {
  return {
    lenis: readonly(instance),
    start: () => instance.value?.start(),
    stop: () => instance.value?.stop(),
    /** Smooth when Lenis is active, instant native scroll otherwise (reduced motion). */
    scrollTo(target: ScrollTarget, options: LenisScrollToOptions = {}) {
      if (instance.value) instance.value.scrollTo(target, options)
      else if (import.meta.client) nativeScrollTo(target, options.offset)
    },
  }
}
