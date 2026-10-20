<script lang="ts">
/**
 * Hero pacing (ART_DIRECTION §4 1A/1B incl. Exit) for the HTML side. Hero timings are fractions
 * of the hero progress p (0–1); exit timings live in heroExitParams (fractions of e). Pin and exit
 * lengths are in viewport heights; distances in px.
 * WebGL timing (assembly, seam sweep, hover, push, aperture) lives in piecesParams / heroExitParams.
 */
export const heroTimeline = {
  pinDesktop: 2.5,
  pinMobile: 1.5,
  /** Extra pinned scroll for the exit through the O. */
  exitDesktop: 1.5,
  exitMobile: 1,
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
  /** Rise distance of headline, mono line and the day copy (px). */
  rise: 28,
}
</script>

<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getInkWorld, getWorld, setWorldOverride } from '~/composables/useWorld'
import { createAtmosphereScene, type AtmosphereScene } from '~/utils/atmosphere/scene'
import { createDayScene, type DayScene } from '~/utils/day/scene'
import { apertureState, exitWorld, heroExitParams, type Aperture } from '~/utils/hero/exit'
import { createPiecesScene, type PiecesScene } from '~/utils/pieces/scene'
import type { BindingParams } from 'tweakpane'

type GlassHandle = { setExit: (progress: number) => void }

const page = ref<HTMLElement | null>(null)
const wrap = ref<HTMLElement | null>(null)
const hero = ref<HTMLElement | null>(null)
const introBlock = ref<HTMLElement | null>(null)
const cueBlock = ref<HTMLElement | null>(null)
const introText = ref<GlassHandle | null>(null)
const cueText = ref<GlassHandle | null>(null)
const headline = ref<HTMLElement | null>(null)
const mono = ref<HTMLElement | null>(null)
const headlineText = ref<GlassHandle | null>(null)
const monoText = ref<GlassHandle | null>(null)
const dayCopy = ref<HTMLElement | null>(null)

const reducedMotion = useReducedMotion()
const { isMobile } = useDevice()
const state = { p: 0, e: 0 }
let atmosphere: AtmosphereScene | null = null
let pieces: PiecesScene | null = null
let day: DayScene | null = null
let ctx: gsap.Context | null = null

/** The day region seen through the O right now — null when no day is visible. */
function currentAperture(): Aperture | null {
  const counter = pieces?.apertureScreen()
  if (!counter) return null
  return apertureState(state.p, state.e, counter, window.innerWidth, window.innerHeight, isMobile.value)
}

// During the exit the aperture drives the world: ink switches around 50% coverage,
// the night stops rendering only once the day covers everything.
const exitWorldProvider = () => {
  const a = currentAperture()
  return a ? exitWorld(a.coverage) : null
}

function apply() {
  pieces?.setAssembly(state.p)
  pieces?.setExit(state.e)
  const introExit = state.p / heroTimeline.introExitEnd
  introText.value?.setExit(introExit)
  cueText.value?.setExit(introExit)
  const statementExit = state.e / heroExitParams.glassExitEnd
  headlineText.value?.setExit(statementExit)
  monoText.value?.setExit(statementExit)
  setWorldOverride(state.e > 0 ? exitWorldProvider : null)
}

function buildTimeline() {
  const T = heroTimeline
  const X = heroExitParams
  const statement = [headline.value, mono.value]
  if (reducedMotion.value) {
    // No pin and no exit: the assembled hero as a still composition, then a plain crossfade
    // (by the sections' data-world) into the day section below.
    state.p = 1
    state.e = 0
    apply()
    gsap.set(statement, { autoAlpha: 1, y: 0 })
    gsap.set([introBlock.value, cueBlock.value], { autoAlpha: 0 })
    gsap.set(dayCopy.value, { autoAlpha: 1, y: 0 })
    return
  }
  state.p = 0
  state.e = 0
  apply()
  const H = isMobile.value ? T.pinMobile : T.pinDesktop
  const E = isMobile.value ? T.exitMobile : T.exitDesktop
  gsap.set(statement, { autoAlpha: 0, y: T.rise })
  gsap.set(dayCopy.value, { autoAlpha: 0, y: T.rise })
  // Timeline time is in viewport heights of scroll: p over the hero segment, then e over the exit.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero.value,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * (H + E)}`,
      scrub: T.scrub,
      invalidateOnRefresh: true,
    },
  })
  tl.to(state, { p: 1, duration: H, onUpdate: apply }, 0)
  tl.to(state, { e: 1, duration: E, onUpdate: apply }, H)
  tl.to(introBlock.value, { y: -T.introRise, duration: T.introExitEnd * H }, 0)
  tl.to(headline.value, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: T.headlineDuration * H }, T.headlineStart * H)
  tl.to(mono.value, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: T.headlineDuration * H }, (T.headlineStart + T.monoDelay) * H)
  // The day section's copy rises in as the day takes over (clean rise, no blur).
  tl.to(dayCopy.value, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: (1 - X.textStart) * E }, H + X.textStart * E)
}

function rebuild() {
  ctx?.revert()
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

// Registered before the stage scenes below, so the pin exists when their triggers are created.
onMounted(rebuild)
watch([reducedMotion, isMobile], rebuild)
// Night/day sections — the plain crossfade in reduced motion, and the world after the pin.
useWorldSections()

let exitFolder: { dispose(): void } | null = null
onMounted(() => {
  if (!import.meta.dev) return
  const w = window as Window & { __atmosphere?: () => AtmosphereScene | null; __heroExit?: () => object }
  w.__atmosphere = () => atmosphere
  ;(w as Window & { __heroExitParams?: typeof heroExitParams }).__heroExitParams = heroExitParams
  w.__heroExit = () => ({ p: state.p, e: state.e, aperture: currentAperture(), counter: pieces?.apertureScreen(), world: getWorld(), ink: getInkWorld() })
  void useDevPane().then((pane) => {
    if (!pane) return
    const X = heroExitParams
    const f = pane.addFolder({ title: 'hero-exit', expanded: false })
    const b = (key: keyof typeof X, opts: BindingParams) => f.addBinding(X, key, opts).on('change', apply)
    b('pushDistance', { label: 'push distance (counter radii)', min: 1.05, max: 4, step: 0.01 })
    b('easeSplit', { label: 'ease split', min: 0.05, max: 0.95, step: 0.01 })
    b('zoomCurve', { label: 'zoom curve (0 log · 1 linear)', min: 0, max: 1, step: 0.01 })
    b('feather', { label: 'aperture feather (px)', min: 0, max: 12, step: 0.5 })
    b('rimBloom', { label: 'rim bloom', min: 0, max: 1, step: 0.01 })
    b('rimWidth', { label: 'rim width (px)', min: 2, max: 60, step: 1 })
    b('zoomBlur', { label: 'zoom blur' })
    b('zoomBlurStrength', { label: 'zoom blur strength', min: 0, max: 0.03, step: 0.001 })
    b('hintIntensity', { label: 'hint intensity', min: 0, max: 1, step: 0.01 })
    b('lightIntensity', { label: 'aperture light', min: 0, max: 40, step: 0.1 })
    b('lightRange', { label: 'light range (radii)', min: 0.5, max: 10, step: 0.1 })
    b('radialDofStart', { label: 'soften from (caps)', min: 0, max: 10, step: 0.05 })
    b('radialDofEnd', { label: 'soften to (caps)', min: 0.1, max: 15, step: 0.05 })
    b('pushStart', { min: 0, max: 1, step: 0.005 })
    b('pushEnd', { min: 0, max: 1, step: 0.005 })
    b('brightenEnd', { min: 0, max: 1, step: 0.005 })
    b('apertureStart', { min: 0, max: 1, step: 0.005 })
    b('apertureEnd', { min: 0, max: 1, step: 0.005 })
    b('inkFrom', { label: 'ink switch from (coverage)', min: 0, max: 1, step: 0.01 })
    b('inkTo', { label: 'ink switch to (coverage)', min: 0, max: 1, step: 0.01 })
    exitFolder = {
      dispose() {
        pane.remove(f)
        f.dispose()
      },
    }
  })
})
onBeforeUnmount(() => {
  ctx?.revert()
  setWorldOverride(null)
  exitFolder?.dispose()
  exitFolder = null
})

// Stage scenes, drawn in this order: night atmosphere → day (its aperture sits between the
// atmosphere and the pieces) → pieces. Atmosphere and pieces use the hero wrapper (it contains the
// pin spacer); the day uses the whole page (it shows through the O long before its section).
useStageScene(() => (atmosphere = createAtmosphereScene({ id: 'hero-atmosphere', preset: 'hero' })), wrap, {
  order: 0,
  progress: { start: 'top top', end: 'bottom bottom' },
})
useStageScene(
  () => {
    day = createDayScene({ id: 'hero-day', preset: 'problems' })
    day.setApertureSource(currentAperture)
    return day
  },
  page,
  { order: 1, world: 'day' },
)
useStageScene(
  () => {
    pieces = createPiecesScene({
      id: 'hero-pieces',
      keyLight: () => atmosphere?.keyLight() ?? { x: 0.8, y: 0.9, color: '#ffffff' },
      apertureColor: () => day?.warmLightHex() ?? '#ffeedd',
    })
    pieces.setAssembly(state.p)
    pieces.setExit(state.e)
    hero.value?.style.setProperty('--logo-ratio', String(pieces.logotypeRatio))
    return pieces
  },
  wrap,
  { order: 2 },
)
</script>

<template>
  <UiSiteNav />
  <main ref="page">
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
          <!-- Wrappers rise in (p); the GlassText inside passes behind glass on the exit (e). -->
          <div ref="headline">
            <UiGlassText ref="headlineText" as="h1" class="headline" exit-mode="manual">
              Technology built around the way your business works.
            </UiGlassText>
          </div>
          <div ref="mono">
            <UiGlassText ref="monoText" as="p" class="services" exit-mode="manual">
              SOFTWARE &amp; APPS · AI MODELING · COMPUTER VISION · STAFF AUGMENTATION · TRAINING
            </UiGlassText>
          </div>
        </div>
      </section>
    </div>

    <!-- Day section (Phase 6 world). Pulled up one viewport so it sits at the top exactly when the
         pin releases; transparent — the day atmosphere is the background. -->
    <section class="day" data-scene data-world="day">
      <div ref="dayCopy" class="day-copy">
        <p class="label">THE WAY YOU ACTUALLY WORK</p>
        <h2 class="serif">Every business has its own way of working.</h2>
        <p class="body">Most software ignores it. We start by learning it.</p>
      </div>
      <NuxtLink to="/lab" class="label back">← /lab</NuxtLink>
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
  margin-inline: auto;
  font-family: var(--font-sans);
  font-weight: 300;
  /* ≈ 54px at 1440 wide. */
  font-size: clamp(28px, 3.75vw, 54px);
  line-height: 1.1;
  color: var(--night-text);
}

/* ── Day section (same test copy as /lab/day) ── */
.day {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160svh;
  padding: 0 var(--gutter) var(--gutter);
}

/* Pulled up one viewport only when the exit runs (no reduced motion) — CSS, so SSR and client agree. */
@media (prefers-reduced-motion: no-preference) {
  .day {
    margin-top: -100svh;
  }
}

.day-copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 11em;
  padding-top: 30svh;
  font-size: clamp(40px, 5.56vw, 80px);
}

.label {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--world-muted);
}

.serif {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(40px, 5.56vw, 80px);
  line-height: 1.02;
  color: var(--world-ink);
}

.body {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 22px;
  line-height: 1.45;
  color: var(--world-ink);
  max-width: 22em;
}

.back {
  align-self: flex-start;
  text-decoration: underline;
}
</style>
