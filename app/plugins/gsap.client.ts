import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'

// Registered once, globally — components can import from 'gsap' directly afterwards.
export default defineNuxtPlugin({
  name: 'gsap',
  setup() {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin)

    return {
      provide: {
        gsap,
        ScrollTrigger,
      },
    }
  },
})
