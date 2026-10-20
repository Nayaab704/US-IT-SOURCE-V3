<script lang="ts">
/** Rectangle-rule tuning (scroll lengths in viewport heights). */
export const heroTransition = {
  /** Plain hero, then the transition (viewport heights of scroll). */
  hold: 1,
  transition: 0.8,
  transitionMobile: 0.5,
  /** Final rectangle (fractions of the viewport), its centre height, corner radius (px). */
  width: 0.62,
  height: 0.56,
  centerY: 0.4,
  radius: 18,
  scrub: 0.6,
}
</script>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { OpeningMode, OpeningWorld, RevealKind } from '~/components/ui/Opening.client.vue'
import { OPENING_ITEMS } from '~/utils/opening'
import { addWorldOverride } from '~/composables/useWorld'
import { createRibbonScene, type RibbonScene } from '~/utils/ribbon/scene'

/**
 * Home hero (ART_DIRECTION v2 §4.2): the opening (first visit), the inflated-latex ribbon and the hero
 * type. Pinned for 100vh, then the RECTANGLE RULE (§3): over the next 80vh (50vh on phones) the whole
 * hero — WebGL render and HTML — shrinks into a rounded rectangle while rising, revealing the paper;
 * after the pin it carries on up and out with the section. Fully reversible.
 */

const props = withDefaults(defineProps<{ refreshPriority?: number }>(), { refreshPriority: 3 })
const emit = defineEmits<{ done: [] }>()

const root = ref<HTMLElement | null>(null)
const pinEl = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)
const hero = ref<{ play: (fast?: boolean) => void; show: () => void } | null>(null)
const prefersReduced = useReducedMotion()
const device = useDevice()
const mounted = ref(false)
const reducedMotion = computed(() => mounted.value && prefersReduced.value)
const isMobile = computed(() => mounted.value && device.isMobile.value)

let scene: RibbonScene | null = null
let ctx: gsap.Context | null = null
let pin: ScrollTrigger | null = null
const state = { t: 0 }

// ── Opening ──
const ready = ref(false)
function pollReady() {
  if (scene?.isReady()) {
    ready.value = true
    gsap.ticker.remove(pollReady)
  }
}
const world: OpeningWorld = {
  setInflate: (v) => scene?.setInflate(v),
  setDolly: (s) => scene?.setDolly(s),
}
const route = useRoute()
const mode = computed<OpeningMode>(() => {
  const q = route.query.opening
  // Arriving with a target (e.g. back from a case study to the contact section): no opening.
  if (route.query.to) return 'off'
  return q === 'first' || q === 'repeat' || q === 'off' ? q : 'auto'
})
function onReveal(kind: RevealKind) {
  if (kind === 'static') hero.value?.show()
  else hero.value?.play(kind === 'fast')
}

// ── The rectangle rule ──
/** The section's top in viewport px from the pin math (no layout read). */
function sectionTop() {
  if (!pin) return root.value?.getBoundingClientRect().top ?? 0
  const y = window.scrollY
  return y < pin.start ? pin.start - y : y > pin.end ? pin.end - y : 0
}
const ease = gsap.parseEase('power2.inOut')
/** The hero rectangle in viewport px at transition t (follows the section after the pin). */
function rectAt(t: number) {
  const H = heroTransition
  const vw = window.innerWidth
  const vh = window.innerHeight
  const e = ease(Math.min(1, Math.max(0, t)))
  const w = vw + (H.width * vw - vw) * e
  const h = vh + (H.height * vh - vh) * e
  const cy = vh / 2 + (H.centerY * vh - vh / 2) * e
  return { x: (vw - w) / 2, y: cy - h / 2, w, h, radius: H.radius * e, vw, vh }
}

let navInRect = true
/** The hero rectangle is still (partly) on screen: only then does it decide the nav's ink. */
let rectOnScreen = true
function apply() {
  const t = state.t
  if (!scene || !card.value) return
  if (reducedMotion.value) {
    // A plain crossfade to paper.
    scene.setPresentRect(null)
    scene.setFade(t)
    card.value.style.opacity = String(1 - t)
    card.value.style.transform = ''
    card.value.style.clipPath = ''
    return
  }
  scene.setFade(0)
  if (t <= 0) {
    scene.setPresentRect(null)
    card.value.style.transform = ''
    card.value.style.clipPath = ''
    navInRect = true
    return
  }
  const r = rectAt(t)
  const top = sectionTop()
  scene.setPresentRect({ x: r.x, y: r.y + top, w: r.w, h: r.h, radius: r.radius })
  // HTML: the same cover-scale about the centre, clipped to the same rounded rectangle.
  const s = Math.max(r.w / r.vw, r.h / r.vh)
  const dx = r.x + r.w / 2 - r.vw / 2
  const dy = r.y + r.h / 2 - r.vh / 2
  const iw = (r.vw - r.w / s) / 2
  const ih = (r.vh - r.h / s) / 2
  card.value.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${s.toFixed(5)})`
  card.value.style.clipPath = `inset(${ih.toFixed(2)}px ${iw.toFixed(2)}px round ${(r.radius / s).toFixed(2)}px)`
  // The nav (top centre) is "on the night" while the rectangle is behind it.
  navInRect = r.y + top <= 48 && r.y + top + r.h >= 48
  rectOnScreen = r.y + top + r.h > 0
}

function buildTimeline() {
  const H = heroTransition
  const T = isMobile.value ? H.transitionMobile : H.transition
  state.t = 0
  apply()
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: pinEl.value,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * (H.hold + T)}`,
      scrub: H.scrub,
      invalidateOnRefresh: true,
      refreshPriority: props.refreshPriority,
    },
  })
  pin = tl.scrollTrigger ?? null
  tl.to({}, { duration: H.hold }, 0)
  tl.to(state, { t: 1, duration: T, onUpdate: apply }, H.hold)
}

function rebuild() {
  ctx?.revert()
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

/** Keep the rect (and the nav ink) right after the pin too, while it rides out with the section. */
function onTick() {
  if (!scene) return
  if (state.t > 0 && !reducedMotion.value && (rectOnScreen || sectionTop() > -window.innerHeight * 2)) apply()
}

// World for the nav during the transition: the ribbon (night) and the paper (day) both render; the
// ink follows what is actually behind the nav.
const worldProvider = () => (state.t > 0 && rectOnScreen && !reducedMotion.value ? { ink: navInRect ? 0 : 1, render: 0.5 } : null)

function onDone() {
  // The opening released the scroll: re-measure every pin.
  ScrollTrigger.refresh()
  emit('done')
}

let removeOverride: (() => void) | null = null

// The pin first (setup order), then the stage registers the ribbon below.
onMounted(() => {
  mounted.value = true
  rebuild()
  gsap.ticker.add(pollReady)
  gsap.ticker.add(onTick)
  removeOverride = addWorldOverride(worldProvider)
})
useStageScene(
  () => {
    scene = createRibbonScene({ id: 'hero-ribbon' })
    return scene
  },
  root,
  { world: 'night' },
)
watch([reducedMotion, isMobile], rebuild)
onBeforeUnmount(() => {
  gsap.ticker.remove(pollReady)
  gsap.ticker.remove(onTick)
  removeOverride?.()
  removeOverride = null
  ctx?.revert()
})
</script>

<template>
  <section id="top" ref="root" class="hero" data-world="night">
    <div ref="pinEl" class="hero-pin">
      <div ref="card" class="hero-card">
        <ScenesHeroOverlay ref="hero" />
      </div>
    </div>
    <ClientOnly>
      <UiOpening :ready="ready" :world="world" :mode="mode" @reveal="onReveal" @done="onDone" />
      <!-- The opening's first frame, server-rendered: the same words where the opening starts them. -->
      <template #fallback>
        <div v-if="!route.query.to" class="opening-cover" aria-hidden="true">
          <span
            v-for="it in OPENING_ITEMS"
            :key="it.id"
            class="opening-item"
            :class="[it.kind, { 'desktop-only': !it.mobile }]"
            :style="{ left: `${it.x * 100}%`, top: `${it.y * 100}%` }"
            >{{ it.text }}</span
          >
        </div>
      </template>
    </ClientOnly>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
}

.hero-pin {
  position: relative;
  height: 100vh;
  height: 100svh;
}

/* The hero's HTML: above the stage canvas (also when a later section raises it), shrinks with the
   rectangle rule. */
.hero-card {
  position: absolute;
  inset: 0;
  z-index: 2;
  transform-origin: 50% 50%;
  will-change: transform, clip-path;
}

.opening-cover {
  position: fixed;
  inset: 0;
  z-index: 900;
  overflow: hidden;
  background: var(--paper-raised);
  color: var(--ink);
}

/* Must match the opening's own item styles (Opening.client.vue). */
.opening-item {
  position: absolute;
  white-space: nowrap;
  translate: 0 -50%;
}

.opening-item.word {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(48px, 5.83vw, 84px);
  line-height: 1;
  letter-spacing: -0.015em;
}

.opening-item.label {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
}

@media (max-width: 767px) {
  .opening-item.word {
    font-size: 48px;
  }

  .opening-item.desktop-only {
    display: none;
  }
}
</style>
