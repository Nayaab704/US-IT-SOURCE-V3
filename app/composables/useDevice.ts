const MOBILE_MAX_WIDTH = 768

const isMobile = ref(false)
const isLowPower = ref(false)
let initialised = false

interface NavigatorHints {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

function detectLowPower(): boolean {
  // Heuristic only: browsers expose no real GPU/battery signal. Few cores, little memory
  // or an explicit data-saver request are the best proxies for "keep the WebGL light".
  const nav = navigator as Navigator & NavigatorHints
  const cores = nav.hardwareConcurrency ?? 8
  const memory = nav.deviceMemory ?? 8
  return cores <= 4 || memory <= 4 || nav.connection?.saveData === true
}

/**
 * isMobile: viewport < 768px OR a coarse (touch) primary pointer.
 * isLowPower: heuristic, see detectLowPower().
 * Both are `false` during SSR.
 */
export function useDevice() {
  if (import.meta.client && !initialised) {
    initialised = true
    const coarse = window.matchMedia('(pointer: coarse)')
    const update = () => {
      isMobile.value = window.innerWidth < MOBILE_MAX_WIDTH || coarse.matches
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    coarse.addEventListener('change', update)
    isLowPower.value = detectLowPower()
  }
  return {
    isMobile: readonly(isMobile),
    isLowPower: readonly(isLowPower),
  }
}
