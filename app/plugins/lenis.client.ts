import Lenis from 'lenis'
import type { LenisOptions } from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setLenisInstance } from '~/composables/useLenis'

/** Tweakable scroll feel. lerp: lower = heavier/smoother, higher = snappier. */
export const lenisParams: LenisOptions = {
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 1,
  smoothWheel: true,
  anchors: true,
}

export default defineNuxtPlugin({
  name: 'lenis',
  dependsOn: ['gsap'],
  setup() {
    const reducedMotion = useReducedMotion()
    let lenis: Lenis | null = null

    // gsap.ticker passes seconds; Lenis expects milliseconds.
    const raf = (time: number) => lenis?.raf(time * 1000)

    // Without this, GSAP "catches up" after a dropped frame and the scroll visibly jumps.
    gsap.ticker.lagSmoothing(0)

    function create() {
      // autoRaf off: one clock (gsap.ticker) drives both scrolling and every animation.
      lenis = new Lenis({ ...lenisParams, autoRaf: false })
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(raf)
      setLenisInstance(lenis)
    }

    function destroy() {
      gsap.ticker.remove(raf)
      lenis?.destroy()
      lenis = null
      setLenisInstance(null)
    }

    // Reduced motion → native scroll. Reacts live if the OS setting changes.
    watch(
      reducedMotion,
      (reduced) => {
        if (reduced) destroy()
        else if (!lenis) create()
        ScrollTrigger.refresh()
      },
      { immediate: true },
    )
  },
})
