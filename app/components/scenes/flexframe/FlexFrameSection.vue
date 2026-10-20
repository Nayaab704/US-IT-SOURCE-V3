<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { flexParams } from '~/utils/flexframe/params'
import { createFlexFrameScene, FLEX_MEDIA, type FlexFrameScene } from '~/utils/flexframe/scene'
import { insideParams } from '~/utils/inside/params'
import { addWorldOverride } from '~/composables/useWorld'

/**
 * The flexible-frame section (phases S1 + S3) — "The line & the flexible frame" → "Inside". Used by
 * the homepage and /lab/flexframe. The page that hosts it calls useWorldSections() (after every pin
 * exists).
 * One pin, one scrubbed timeline: p (S1, `pin` viewport heights) → the doors d (STEP / INSIDE slide
 * apart while the frame opens to the full screen) → the INSIDE world q (camera glide, phrases,
 * the lattice, into the light, paper). The small card plays real footage (blue duotone); the sweep
 * turns it into a window onto the world, rendered on the same stage.
 * The stage canvas sits ABOVE this section's HTML while it is on screen (html.stage-front), so the
 * line passes in front of the headline; everything that must be on top of the frame is in fixed
 * layers above the canvas.
 */
type GlassHandle = { setExit: (progress: number) => void }

/** The story told inside (real HTML): q where each enters, and its side. */
const PHRASES = [
  { text: 'Every business has a structure', q: 0.05, side: -1, top: 30 },
  { text: 'most software never finds.', q: 0.15, side: 1, top: 44 },
  { text: 'We go inside,', q: 0.32, side: -1, top: 34 },
  { text: 'find it,', q: 0.42, side: 1, top: 48 },
  { text: 'and build around it.', q: 0.52, side: -1, top: 38 },
] as const
const LABELS = [
  { text: 'SIT WITH THE WORK', q: 0.08, side: 1, top: 70 },
  { text: 'MAP THE FLOW', q: 0.24, side: -1, top: 64 },
  { text: 'BUILD TO THE MAP', q: 0.4, side: 1, top: 74 },
  { text: 'RUN IT, GROW IT', q: 0.56, side: -1, top: 68 },
] as const

const props = withDefaults(defineProps<{ refreshPriority?: number }>(), { refreshPriority: 1 })
const root = ref<HTMLElement | null>(null)
const section = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)
const headWrap = ref<HTMLElement | null>(null)
const headline1 = ref<GlassHandle | null>(null)
const headline2 = ref<GlassHandle | null>(null)
const copy = ref<HTMLElement | null>(null)
const w1 = ref<HTMLElement | null>(null)
const w2 = ref<HTMLElement | null>(null)
const wordsLayer = ref<HTMLElement | null>(null)
const insideLayer = ref<HTMLElement | null>(null)
const phraseEls = ref<HTMLElement[]>([])
const labelEls = ref<HTMLElement[]>([])
const stillFrame = ref<HTMLElement | null>(null)

const prefersReduced = useReducedMotion()
// The server always renders the full version; the reduced-motion layout switches in after mount.
const mounted = ref(false)
const reducedMotion = computed(() => mounted.value && prefersReduced.value)
const device = useDevice()
// Same as reduced motion: the server renders desktop; the phone variant switches in after mount.
const isMobile = computed(() => mounted.value && device.isMobile.value)
const state = { p: 0, d: 0, q: 0 }
let scene: FlexFrameScene | null = null
let ctx: gsap.Context | null = null
let pinTrigger: ScrollTrigger | null = null
let sectionDocTop = 0
let stillDocTop = 0

function sectionTop() {
  const y = window.scrollY
  if (pinTrigger) return y < pinTrigger.start ? pinTrigger.start - y : y > pinTrigger.end ? pinTrigger.end - y : 0
  return sectionDocTop - y
}
function staticFrame() {
  const el = stillFrame.value
  if (!el) return null
  return { x: el.offsetLeft, y: stillDocTop - window.scrollY, w: el.offsetWidth, h: el.offsetHeight }
}
function onRefresh() {
  if (section.value) sectionDocTop = section.value.getBoundingClientRect().top + window.scrollY
  if (stillFrame.value) stillDocTop = stillFrame.value.getBoundingClientRect().top + window.scrollY
  scene?.remeasure()
}

const T = flexParams.timing
const range = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / Math.max(b - a, 1e-6)))
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const worldVh = () => (isMobile.value ? T.worldMobile : T.world)

function apply() {
  scene?.setProgress(state.p)
  scene?.setDoors(state.d)
  scene?.setWorld(state.q)
  const e = range(state.p, T.headlineExit)
  headline1.value?.setExit(Math.min(1, e * 1.25))
  headline2.value?.setExit(Math.max(0, e * 1.25 - 0.25))
  placeInside()
}

/**
 * Phrases and labels drift sideways, outward on their own side (as things beside a forward-moving
 * camera do), each at its own multiple of the scroll speed. Pure functions of q: reversible.
 */
function placeInside() {
  if (reducedMotion.value) return
  const vw = window.innerWidth
  const scrollPerQ = worldVh() * window.innerHeight
  const place = (el: HTMLElement | undefined, q0: number, side: number, speed: number, life: number) => {
    if (!el) return
    const t = state.q - q0
    const a = state.d >= 1 ? smooth(0, 0.035, t) * (1 - smooth(life * 0.6, life, t)) : 0
    el.style.opacity = a.toFixed(3)
    el.style.visibility = a > 0.001 ? 'visible' : 'hidden'
    if (a <= 0.001) return
    const x = side * (-0.1 * vw + t * scrollPerQ * speed)
    el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`
  }
  PHRASES.forEach((ph, i) => place(phraseEls.value[i], ph.q, ph.side, insideParams.text.speeds[i] ?? 1, 0.3))
  LABELS.forEach((l, i) => place(labelEls.value[i], l.q, l.side, insideParams.text.labelSpeeds[i] ?? 1, 0.36))
}

function wordFrom(el: HTMLElement | null, leftFraction: number) {
  return () => {
    if (!el || !section.value) return { x: 0, y: 0, scale: 1 }
    const saved = el.style.transform
    el.style.transform = 'none'
    const final = el.getBoundingClientRect()
    el.style.transform = saved
    const sec = section.value.getBoundingClientRect()
    const initialSize = isMobile.value ? 56 : 150
    const finalSize = parseFloat(getComputedStyle(el).fontSize) || 120
    const scale = initialSize / finalSize
    const x = sec.left + leftFraction * sec.width - final.left
    const y = sec.top + sec.height - initialSize * 0.62 - final.top
    return { x, y, scale }
  }
}

function buildTimeline() {
  if (!scene) return
  const sec = section.value
  pinTrigger = null
  if (reducedMotion.value) {
    scene.setStatic(true)
    Object.assign(state, { p: 0, d: 0, q: 0 })
    apply()
    gsap.set(copy.value, { autoAlpha: 1, y: 0 })
    // The section and the still world below it.
    stageFront(sec, 1.4)
    return
  }
  scene.setStatic(false)
  Object.assign(state, { p: 0, d: 0, q: 0 })
  apply()
  const pin = isMobile.value ? T.pinMobile : T.pin
  const doors = isMobile.value ? T.doorsMobile : T.doors
  const worldLen = worldVh()
  const words = [w1.value, w2.value]
  const from1 = wordFrom(w1.value, 0.08)
  const from2 = wordFrom(w2.value, isMobile.value ? 0.6 : 0.54)
  gsap.set(copy.value, { autoAlpha: 0, y: 16 })
  gsap.set(words, { transformOrigin: '0% 0%' })

  // Timeline time: 1 = the S1 pin; the doors and the world follow in the same units (vh / pin).
  const dDur = doors / pin
  const qDur = worldLen / pin
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * (pin + doors + worldLen)}`,
      scrub: T.scrub,
      invalidateOnRefresh: true,
      // Refresh before every other trigger (the stage's, the world's), even when this pin is rebuilt
      // after them (mobile / reduced-motion switch): theirs then include its spacing. On a page with
      // several pins, earlier sections get a higher priority.
      refreshPriority: props.refreshPriority,
    },
  })
  pinTrigger = tl.scrollTrigger ?? null
  const dur = ([a, b]: readonly [number, number]) => Math.max(b - a, 0.001)
  tl.to(state, { p: 1, duration: 1, onUpdate: apply }, 0)
  // The scene eases the frame's growth itself (power2.inOut); d stays linear in scroll.
  tl.to(state, { d: 1, duration: dDur, onUpdate: apply }, 1)
  tl.to(state, { q: 1, duration: qDur, onUpdate: apply }, 1 + dDur)
  tl.to(copy.value, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: dur(T.copyIn) }, T.copyIn[0])
  tl.to(copy.value, { autoAlpha: 0, y: -36, ease: 'power1.in', duration: dur(T.copyOut) }, T.copyOut[0])
  tl.fromTo(headWrap.value, { y: 0 }, { y: -48, ease: 'power1.in', duration: dur(T.headlineExit) }, T.headlineExit[0])
  tl.fromTo(
    w1.value,
    { x: () => from1().x, y: () => from1().y, scale: () => from1().scale, color: 'rgba(22, 24, 29, 0.06)' },
    { x: 0, y: 0, scale: 1, color: '#ffffff', ease: 'power3.inOut', duration: dur(T.words) },
    T.words[0],
  )
  tl.fromTo(
    w2.value,
    { x: () => from2().x, y: () => from2().y, scale: () => from2().scale, color: 'rgba(22, 24, 29, 0.06)' },
    { x: 0, y: 0, scale: 1, color: '#ffffff', ease: 'power3.inOut', duration: dur(T.words) },
    T.words[0],
  )
  // The doors: STEP off to the left, INSIDE off to the right, as the frame opens.
  tl.fromTo(w1.value, { x: 0 }, { x: () => -0.8 * window.innerWidth, ease: 'power2.inOut', duration: dDur, immediateRender: false }, 1)
  tl.fromTo(w2.value, { x: 0 }, { x: () => 0.8 * window.innerWidth, ease: 'power2.inOut', duration: dDur, immediateRender: false }, 1)
  // The section's corner marks would show through once the world has turned to paper.
  tl.to(sec?.querySelectorAll('.ff-mark') ?? [], { autoAlpha: 0, duration: dDur * 0.5 }, 1)
  // Only until the pin ends: the next section (Projects) starts right there, above the canvas.
  stageFront(sec, pin + doors + worldLen, 1)
}

/** Canvas above this section's HTML from when it enters for `pin + after` viewport heights. */
function stageFront(sec: HTMLElement | null, pin: number, after = 2) {
  ScrollTrigger.create({
    trigger: sec,
    start: 'top bottom',
    end: () => `+=${window.innerHeight * (pin + after)}`,
    invalidateOnRefresh: true,
    onToggle: (self) => document.documentElement.classList.toggle('stage-front', self.isActive),
  })
}

function rebuild() {
  ctx?.revert()
  document.documentElement.classList.remove('stage-front')
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

// Per frame: the fixed layers follow the section (before / after the pin).
function onTick() {
  if (!section.value || !scene) return
  const y = `translate3d(0, ${sectionTop().toFixed(1)}px, 0)`
  if (wordsLayer.value) wordsLayer.value.style.transform = y
  if (insideLayer.value) insideLayer.value.style.transform = y
}

// Order matters: the scene AND the pin must exist before the stage and the world sections create
// their triggers (their onMounted hooks run after this one).
onMounted(() => {
  mounted.value = true
  scene = createFlexFrameScene({
    id: 'flexframe',
    section: () => section.value,
    card: () => card.value,
    onTimingChange: rebuild,
    sectionTop,
    staticFrame,
  })
  const start = () => {
    rebuild()
    ScrollTrigger.addEventListener('refresh', onRefresh)
    onRefresh()
    gsap.ticker.add(onTick)
  }
  if (prefersReduced.value) nextTick(start)
  else start()
})
useStageScene(() => scene!, root, { world: 'day' })
// The section is a day section, but the INSIDE world is dark: DOM ink (the nav) turns light while it
// fills the screen; rendering stays "day" so this scene keeps drawing.
let removeOverride: (() => void) | null = null
onMounted(() => {
  removeOverride = addWorldOverride(() => (!reducedMotion.value && state.d > 0.5 && state.q < 0.93 ? { ink: 0, render: 1 } : null))
})
onBeforeUnmount(() => removeOverride?.())
watch([reducedMotion, isMobile], rebuild)
onBeforeUnmount(() => {
  ScrollTrigger.removeEventListener('refresh', onRefresh)
  gsap.ticker.remove(onTick)
  ctx?.revert()
  document.documentElement.classList.remove('stage-front')
})
</script>

<template>
  <div ref="root" class="ff-root" data-world="day">
    <!-- Duotone for the HTML poster (reduced motion): luminance → #3B5BFF … #C9D0FF. -->
    <svg class="sr-only" aria-hidden="true" focusable="false">
      <filter id="ff-duotone" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.231 0.788" />
          <feFuncG type="table" tableValues="0.357 0.816" />
          <feFuncB type="table" tableValues="1 1" />
        </feComponentTransfer>
      </filter>
    </svg>

    <section ref="section" class="ff" :class="{ 'is-static': reducedMotion }">
      <span class="ff-mark" style="left: var(--gutter); top: 9%">+</span>
      <span class="ff-mark" style="right: var(--gutter); top: 9%">+</span>
      <span class="ff-mark" style="left: var(--gutter); bottom: 5%">+</span>
      <span class="ff-mark" style="right: var(--gutter); bottom: 5%">+</span>

      <div ref="headWrap" class="ff-headline-wrap">
        <h2 class="ff-headline">
          <UiGlassText ref="headline1" as="span" exit-mode="manual" class="ff-line ff-line-1">We start with</UiGlassText>
          <UiGlassText ref="headline2" as="span" exit-mode="manual" class="ff-line">how you actually work.</UiGlassText>
        </h2>
      </div>

      <!-- Measured; the WebGL plane draws the card (live footage). Reduced motion: the HTML poster. -->
      <div ref="card" class="ff-card" role="img" aria-label="Footage: hands at work on engine parts at a workbench">
        <img v-if="reducedMotion" class="ff-card-poster" :src="FLEX_MEDIA.poster" alt="" />
      </div>

      <div ref="copy" class="ff-copy">
        <p>
          US IT Source designs and builds custom software, AI and computer vision around the way each business actually
          runs.
        </p>
        <span class="ff-pill"><span class="dot" aria-hidden="true">•</span> Our approach</span>
      </div>
    </section>

    <!-- The doors' words above the canvas, following the section (outside the pinned element). -->
    <div v-if="!reducedMotion" ref="wordsLayer" class="ff-words-layer">
      <p class="sr-only">{{ flexParams.words.join(' ') }}</p>
      <div class="ff-words" aria-hidden="true">
        <span ref="w1" class="ff-word">{{ flexParams.words[0] }}</span>
        <span ref="w2" class="ff-word">{{ flexParams.words[1] }}</span>
      </div>
    </div>

    <!-- Inside: the phrases and labels over the world (real text, drifting with the scroll). -->
    <div v-if="!reducedMotion" ref="insideLayer" class="in-layer">
      <p
        v-for="ph in PHRASES"
        :key="ph.text"
        ref="phraseEls"
        class="in-phrase"
        :class="ph.side < 0 ? 'is-left' : 'is-right'"
        :style="{ top: `${ph.top}%` }"
      >
        {{ ph.text }}
      </p>
      <span
        v-for="l in LABELS"
        :key="l.text"
        ref="labelEls"
        class="in-label"
        :class="l.side < 0 ? 'is-left' : 'is-right'"
        :style="{ top: `${l.top}%` }"
      >
        {{ l.text }}
      </span>
    </div>

    <!-- Reduced motion: a still of the world (drawn by the WebGL plane) with the story stacked on it. -->
    <section v-if="reducedMotion" class="ff-still">
      <div ref="stillFrame" class="ff-still-frame">
        <div class="ff-still-text">
          <p class="ff-still-words">{{ flexParams.words.join(' ') }}</p>
          <p v-for="ph in PHRASES" :key="ph.text" class="in-phrase is-stacked">{{ ph.text }}</p>
          <ul class="ff-still-labels">
            <li v-for="l in LABELS" :key="l.text" class="in-label is-stacked">{{ l.text }}</li>
          </ul>
        </div>
      </div>
      <div class="ff-still-fade" aria-hidden="true" />
    </section>
  </div>
</template>

<style scoped>
.ff-root {
  position: relative;
  color: var(--ink);
}

.ff {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

.ff-mark {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1;
  color: var(--ink-muted);
}

.ff-headline-wrap {
  position: absolute;
  top: 18%;
  left: var(--gutter);
  right: var(--gutter);
}

.ff-headline {
  --indent: calc(26vw - var(--gutter));
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(44px, 6.67vw, 96px);
  line-height: 1;
  letter-spacing: -0.02em;
}

.ff-line {
  display: block;
  white-space: nowrap;
}

.ff-line-1 {
  padding-left: var(--indent);
}

.ff-card {
  position: absolute;
  left: var(--gutter);
  top: 58%;
  width: 23vw;
  height: 24vh;
  border-radius: 10px;
  overflow: hidden;
}

.ff-card-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: url(#ff-duotone);
}

.ff-copy {
  position: absolute;
  left: 49%;
  top: 58%;
  max-width: 360px;
}

.ff-copy p {
  margin: 0 0 18px;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.5;
}

.ff-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 12px;
}

.ff-pill .dot {
  color: #3b5bff;
}

.ff-words-layer,
.in-layer {
  position: fixed;
  inset: 0;
  z-index: 2; /* above the stage canvas */
  overflow: hidden;
  pointer-events: none;
}

.ff-words {
  position: absolute;
  left: 50%;
  top: calc(22% + 31%);
  display: flex;
  align-items: center;
  gap: 40px;
  translate: -50% -50%;
}

.ff-word {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 120px;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: #fff;
  will-change: transform;
}

/* ── Inside: phrases (Newsreader italic) and labels (Geist Mono), white on the world ── */
.in-phrase {
  position: absolute;
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 300;
  font-size: 64px;
  line-height: 1.05;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: #fff;
  opacity: 0;
  visibility: hidden;
  will-change: transform, opacity;
}

.in-label {
  position: absolute;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0;
  visibility: hidden;
  will-change: transform, opacity;
}

.in-phrase.is-left,
.in-label.is-left {
  left: 8vw;
}

.in-phrase.is-right,
.in-label.is-right {
  right: 8vw;
}

/* ── Reduced motion: the still world (the WebGL plane draws it under this text) ── */
.ff-still {
  position: relative;
}

.ff-still-frame {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background: #08090b; /* until the still has rendered */
}

.ff-still-text {
  position: relative;
  z-index: 2; /* above the canvas */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 18vh var(--gutter) 14vh;
}

.ff-still-words {
  margin: 0 0 4vh;
  color: #fff;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: clamp(56px, 8.3vw, 120px);
  line-height: 1;
  letter-spacing: -0.02em;
}

.in-phrase.is-stacked,
.in-label.is-stacked {
  position: static;
  opacity: 1;
  visibility: visible;
  white-space: normal;
}

.ff-still-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin: 4vh 0 0;
  padding: 0;
  list-style: none;
}

/* From the world's floor into paper. */
.ff-still-fade {
  height: 40vh;
  background: linear-gradient(#08090b, var(--paper));
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .ff-headline-wrap {
    top: 12%;
  }

  .ff-headline {
    --indent: 18vw;
    font-size: 8.6vw;
  }

  .ff-card {
    top: 46%;
    width: 58vw;
    height: 22vh;
  }

  .ff-copy {
    left: var(--gutter);
    right: var(--gutter);
    top: 74%;
  }

  .ff-word {
    font-size: 56px;
  }

  .ff-words {
    flex-direction: column;
    gap: 10px;
  }

  .in-phrase {
    max-width: 78vw;
    font-size: 36px;
    white-space: normal;
  }

  .in-phrase.is-left,
  .in-label.is-left {
    left: var(--gutter);
  }

  .in-phrase.is-right,
  .in-label.is-right {
    right: var(--gutter);
  }
}
</style>
