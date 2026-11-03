<script setup lang="ts">
import { gsap } from 'gsap'
import type { SheenScene } from '~/utils/sheen/scene'
import { aboutParams as P, lineText } from '~/data/about'

/**
 * /about — the giant moving line (night): one sentence at ~16vw, pinned and scrubbed sideways with
 * the scroll, over the void and a few soft lacquer shapes (stage scene, utils/sheen). The section
 * clips its own overflow: the page never scrolls sideways. Reduced motion: the sentence wraps on two
 * lines and stays put.
 */
const props = defineProps<{ refreshPriority?: number }>()
const root = ref<HTMLElement | null>(null)
const pinEl = ref<HTMLElement | null>(null)
const text = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
const device = useDevice()
const mounted = ref(false)
const reduced = computed(() => mounted.value && prefersReduced.value)
const isMobile = computed(() => mounted.value && device.isMobile.value)
// The CSS void stays until the WebGL scene has drawn behind the section (or for good without WebGL).
const canvasShows = ref(false)

let ctx: gsap.Context | null = null
let scene: SheenScene | null = null

function build() {
  const sec = pinEl.value
  const t = text.value
  if (!sec || !t || reduced.value) return
  const pin = isMobile.value ? P.line.pinMobile : P.line.pin
  const vw = () => window.innerWidth
  gsap.fromTo(
    t,
    { x: () => vw() * 0.1 },
    {
      x: () => vw() * 0.9 - t.scrollWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: sec,
        pin: true,
        start: 'top top',
        end: () => `+=${window.innerHeight * pin}`,
        scrub: P.line.scrub,
        invalidateOnRefresh: true,
        refreshPriority: props.refreshPriority,
        onUpdate: (self) => scene?.setProgress(self.progress),
      },
    },
  )
}
function rebuild() {
  ctx?.revert()
  ctx = gsap.context(build, root.value ?? undefined)
}

function watchDrawn() {
  if (scene?.drawn) {
    canvasShows.value = true
    gsap.ticker.remove(watchDrawn)
  }
}

onMounted(() => {
  mounted.value = true
  rebuild()
  gsap.ticker.add(watchDrawn)
})
watch([reduced, isMobile], () => nextTick(rebuild))
onBeforeUnmount(() => {
  gsap.ticker.remove(watchDrawn)
  ctx?.revert()
})

useStageScene(
  () =>
    import('~/utils/sheen/scene').then(({ createSheenScene }) => {
      scene = createSheenScene({ id: 'about-sheen', section: () => pinEl.value })
      return scene
    }),
  root,
  // Nearer than the default: the hero above is about one screen tall, so the default margin would
  // load this during the page load.
  { world: 'night', nearVh: 0.75 },
)
</script>

<template>
  <section ref="root" class="al" data-world="night" :class="{ 'is-canvas': canvasShows, 'is-static': reduced }">
    <div ref="pinEl" class="al-pin">
      <p ref="text" class="al-text">{{ lineText }}</p>
    </div>
  </section>
</template>

<style scoped>
.al {
  position: relative;
  overflow: clip;
}

.al-pin {
  display: flex;
  align-items: center;
  height: 100svh;
  overflow: clip;
  background: var(--void);
  transition: background-color 0.6s;
}

/* The stage canvas (behind the page) paints the void and the shapes. */
.al.is-canvas .al-pin {
  background: transparent;
}

.al-text {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 16vw;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: var(--night-text);
  will-change: transform;
  /* Invisible: tells contrast checkers the backdrop is an image (they cannot see the WebGL void
     behind the sentence, and would otherwise rate white text against the page's paper). */
  background-image: linear-gradient(transparent, transparent);
}

.al.is-static .al-pin {
  height: auto;
  min-height: 70svh;
  padding: 16vh var(--gutter);
}

.al.is-static .al-text {
  font-size: 9vw;
  white-space: normal;
}

@media (max-width: 767px) {
  .al-text {
    font-size: 22vw;
  }

  .al.is-static .al-text {
    font-size: 13vw;
  }
}
</style>
