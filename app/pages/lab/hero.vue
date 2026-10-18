<script lang="ts">
/**
 * Hero pacing (ART_DIRECTION §4 1A/1B) for the HTML side. All values are fractions of the
 * hero progress p (0–1), except pin lengths (viewport heights) and distances (px).
 * WebGL timing (assembly, seam sweep, hover) lives in piecesParams.
 */
export const heroTimeline = {
  pinDesktop: 2.5,
  pinMobile: 1.5,
  /** ScrollTrigger scrub smoothing (s). */
  scrub: 1,
  /** Intro line + cue pass behind glass over p 0 → this. */
  introExitEnd: 0.12,
  /** How far the intro block drifts up while it dissolves (px). */
  introRise: 24,
  headlineStart: 0.7,
  headlineDuration: 0.1,
  /** Mono services line follows the headline by this much p. */
  monoDelay: 0.04,
  /** Rise distance of headline + mono line (px). */
  rise: 28,
}
</script>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createAtmosphereScene, type AtmosphereScene } from '~/utils/atmosphere/scene'
import { createPiecesScene, type PiecesScene } from '~/utils/pieces/scene'

type GlassHandle = { setExit: (progress: number) => void }

const wrap = ref<HTMLElement | null>(null)
const hero = ref<HTMLElement | null>(null)
const introBlock = ref<HTMLElement | null>(null)
const cueBlock = ref<HTMLElement | null>(null)
const introText = ref<GlassHandle | null>(null)
const cueText = ref<GlassHandle | null>(null)
const headline = ref<HTMLElement | null>(null)
const mono = ref<HTMLElement | null>(null)

const reducedMotion = useReducedMotion()
const { isMobile } = useDevice()
const state = { p: 0 }
let atmosphere: AtmosphereScene | null = null
let pieces: PiecesScene | null = null
let ctx: gsap.Context | null = null

function apply() {
  pieces?.setAssembly(state.p)
  const exit = state.p / heroTimeline.introExitEnd
  introText.value?.setExit(exit)
  cueText.value?.setExit(exit)
}

function buildTimeline() {
  const T = heroTimeline
  const copy = [headline.value, mono.value]
  if (reducedMotion.value) {
    // No pin: the assembled logotype, headline and services line as one still, lit composition.
    state.p = 1
    apply()
    gsap.set(copy, { autoAlpha: 1, y: 0 })
    gsap.set([introBlock.value, cueBlock.value], { autoAlpha: 0 })
    return
  }
  state.p = 0
  gsap.set(copy, { autoAlpha: 0, y: T.rise })
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero.value,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * (isMobile.value ? T.pinMobile : T.pinDesktop)}`,
      scrub: T.scrub,
      invalidateOnRefresh: true,
    },
  })
  // One master progress for everything; the scrub smoothing applies to WebGL and HTML alike.
  tl.to(state, { p: 1, duration: 1, onUpdate: apply }, 0)
  tl.to(introBlock.value, { y: -T.introRise, duration: T.introExitEnd }, 0)
  tl.to(headline.value, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: T.headlineDuration }, T.headlineStart)
  tl.to(mono.value, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: T.headlineDuration }, T.headlineStart + T.monoDelay)
}

function rebuild() {
  ctx?.revert()
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

// Registered before the stage scenes below, so the pin exists when their triggers are created.
onMounted(rebuild)
// Dev hook (same as /lab/atmosphere) so tests and the console can reach the live atmosphere.
onMounted(() => {
  if (import.meta.dev) (window as Window & { __atmosphere?: () => AtmosphereScene | null }).__atmosphere = () => atmosphere
})
watch(reducedMotion, rebuild)
onBeforeUnmount(() => ctx?.revert())

// Stage scenes use the wrapper (it contains the pin spacer), so they stay active for the whole pin.
useStageScene(() => (atmosphere = createAtmosphereScene({ id: 'hero-atmosphere', preset: 'hero' })), wrap, {
  order: 0,
  progress: { start: 'top top', end: 'bottom bottom' },
})
useStageScene(
  () => {
    pieces = createPiecesScene({
      id: 'hero-pieces',
      keyLight: () => atmosphere?.keyLight() ?? { x: 0.8, y: 0.9, color: '#ffffff' },
    })
    pieces.setAssembly(state.p)
    hero.value?.style.setProperty('--logo-ratio', String(pieces.logotypeRatio))
    return pieces
  },
  wrap,
  { order: 1 },
)
</script>

<template>
  <UiSiteNav />
  <main>
    <div ref="wrap">
      <section id="hero" ref="hero" class="hero" data-scene data-world="night">
        <!-- The logotype is rendered in WebGL; this is its readable copy. -->
        <span class="visually-hidden">US IT Source</span>

        <div ref="introBlock" class="intro">
          <UiGlassText ref="introText" as="p" exit-mode="manual">
            Custom software, AI and computer vision — built for one business at a time.
          </UiGlassText>
        </div>
        <div ref="cueBlock" class="cue-block">
          <UiGlassText ref="cueText" as="p" class="cue" exit-mode="manual">Scroll to assemble</UiGlassText>
        </div>

        <div class="statement">
          <h1 ref="headline" class="headline">Technology built around the way your business works.</h1>
          <p ref="mono" class="services">
            SOFTWARE &amp; APPS · AI MODELING · COMPUTER VISION · STAFF AUGMENTATION · TRAINING
          </p>
        </div>
      </section>
    </div>

    <section class="after" data-scene data-world="night">
      <p class="cue">Lab — exit through the O is a later phase</p>
      <NuxtLink to="/lab" class="cue back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.hero {
  /* Must match piecesParams.assembly (widthDesktop / widthMobile / centerFromTop). */
  --logo-width: 76vw;
  --logo-center: 42%;
  --logo-ratio: 0.109;

  position: relative;
  height: 100svh;
  overflow: hidden;
}

@media (max-width: 767px), (pointer: coarse) {
  .hero {
    --logo-width: 88vw;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.intro {
  position: absolute;
  left: var(--gutter);
  bottom: calc(var(--gutter) + 48px);
  max-width: 24em;
  font-size: var(--fs-lead);
  line-height: 1.4;
  color: var(--night-text);
}

.cue,
.services {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

.cue-block {
  position: absolute;
  left: 50%;
  bottom: var(--gutter);
  transform: translateX(-50%);
  white-space: nowrap;
}

/* Below the assembled logotype: its centre + half its height + a gap. */
.statement {
  position: absolute;
  left: var(--gutter);
  right: var(--gutter);
  top: calc(var(--logo-center) + var(--logo-width) * var(--logo-ratio) / 2 + 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.headline {
  max-width: 15em;
  font-family: var(--font-sans);
  font-weight: 300;
  /* ≈ 54px at 1440 wide. */
  font-size: clamp(28px, 3.75vw, 54px);
  line-height: 1.1;
  color: var(--night-text);
}

.after {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100svh;
  padding: 120px var(--gutter);
  background: var(--night-0);
}
</style>
