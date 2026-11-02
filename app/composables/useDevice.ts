const MOBILE_MAX_WIDTH = 768

const isMobile = ref(false)
const isLowPower = ref(false)
const isSoftwareGl = ref(false)
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

/** WebGL renderer names of CPU (software) rasterisers: no GPU acceleration at all. */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|basic render driver|software/i

/**
 * Called by the stage once its WebGL context exists. A browser without GPU acceleration draws every
 * pixel on the CPU: such a device gets the low-power path and a reduced render resolution (see
 * useStage computeDpr) — a soft but fluid picture instead of one frame a second.
 */
export function noteWebglRenderer(name: string) {
  if (!SOFTWARE_GL.test(name)) return
  isSoftwareGl.value = true
  isLowPower.value = true
}

/**
 * isMobile: viewport < 768px OR a coarse (touch) primary pointer.
 * isLowPower: heuristic, see detectLowPower(), or a software WebGL renderer (noteWebglRenderer).
 * isSoftwareGl: WebGL runs on the CPU (no GPU acceleration).
 * All are `false` during SSR.
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
    isSoftwareGl: readonly(isSoftwareGl),
  }
}
