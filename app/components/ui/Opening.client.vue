<script setup lang="ts">
import gsap from 'gsap'

/**
 * The opening (phase R2): a white page of drifting words; a black bar slides to the centre — a
 * WINDOW onto the hero world, cut out of this white layer — and opens into a card, then full
 * screen, while the ribbon inside inflates and the camera settles back.
 *
 * The window is a hole in the white layer (clip-path, even-odd), so the stage canvas shows through
 * and words are cut wherever the card overlaps them. At full screen the layer is simply removed.
 * Runs while assets load: it holds at the portrait card until `ready`, never longer than ~7 s.
 */

export interface OpeningWorld {
  setInflate(value: number): void
  setDolly(scale: number): void
}
export type OpeningMode = 'auto' | 'first' | 'repeat' | 'off'
/** How the hero should settle: full choreography, quick (skip / repeat), or no motion. */
export type RevealKind = 'play' | 'fast' | 'static'

const props = withDefaults(defineProps<{ ready: boolean; world: OpeningWorld | null; mode?: OpeningMode }>(), {
  mode: 'auto',
})
const emit = defineEmits<{ reveal: [kind: RevealKind]; done: [] }>()

const SEEN_KEY = 'usits:opening-seen'
/** Grow starts no later than this (s) so the whole opening ends within ~7 s. */
const LATEST_GROW = 5.2

const reducedMotion = useReducedMotion()
const { isMobile } = useDevice()
const lenis = useLenis()
const { time, zone } = useLocalTime()

interface Item {
  id: string
  text: string
  kind: 'word' | 'label'
  /** Start position (fractions of the viewport), drift speed (px/s, sign = direction). */
  x: number
  y: number
  speed: number
  mobile: boolean
}
// Loose editorial scatter over five rows — hand-placed, deliberately not a grid, not centred.
const ITEMS: Item[] = [
  { id: 'built', text: 'Built', kind: 'word', x: 0.07, y: 0.12, speed: 26, mobile: true },
  { id: 'loc', text: '[CITY, STATE]', kind: 'label', x: 0.62, y: 0.17, speed: 44, mobile: false },
  { id: 'route', text: 'A → D → B → F', kind: 'label', x: 0.31, y: 0.29, speed: -60, mobile: true },
  { id: 'you', text: 'you work.', kind: 'word', x: 0.66, y: 0.33, speed: -20, mobile: true },
  { id: 'around', text: 'around', kind: 'word', x: 0.52, y: 0.5, speed: -38, mobile: true },
  { id: 'time', text: '', kind: 'label', x: 0.88, y: 0.58, speed: 18, mobile: true },
  { id: 'theway', text: 'the way', kind: 'word', x: 0.18, y: 0.66, speed: 52, mobile: true },
  { id: 'est', text: 'EST [YEAR]', kind: 'label', x: 0.1, y: 0.84, speed: -30, mobile: false },
]

const active = ref(true)
const layer = ref<HTMLElement | null>(null)
const itemEls = ref<HTMLElement[]>([])
const items = computed(() => ITEMS.filter((i) => !isMobile.value || i.mobile))
const timeText = computed(() => `${time.value} ${zone.value}`.trim())

// The window: centre x (fraction + px), width (fraction + px), height (fraction), corner radius (px).
const win = { cx: 0, cxPx: -21, w: 0, wPx: 0, h: 0.62, r: 0 }
let vw = 1
let vh = 1

function drawWindow() {
  const el = layer.value
  if (!el) return
  const w = Math.max(0, win.w * vw + win.wPx)
  const h = Math.max(0, win.h * vh)
  if (w <= 0.01 || h <= 0.01) {
    el.style.clipPath = ''
    return
  }
  const cx = win.cx * vw + win.cxPx
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = vh / 2 - h / 2
  const y1 = vh / 2 + h / 2
  const r = Math.min(win.r, w / 2, h / 2)
  const hole =
    r > 0.01
      ? `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`
      : `M${x0} ${y0}H${x1}V${y1}H${x0}Z`
  // Even-odd: the screen minus the window.
  el.style.clipPath = `path(evenodd, "M-1 -1H${vw + 1}V${vh + 1}H-1Z${hole}")`
}

// ── Drift: each item on its own speed, wrapping round the screen, with a tiny vertical bob ──
const drift: { x: number; width: number; baseY: number; speed: number; phase: number; bobRate: number }[] = []
let driftClock = 0
function layoutItems() {
  vw = window.innerWidth
  vh = window.innerHeight
  drift.length = 0
  items.value.forEach((it, k) => {
    const el = itemEls.value[k]
    drift.push({
      x: it.x * vw,
      width: el?.offsetWidth ?? 100,
      baseY: it.y * vh,
      speed: it.speed,
      phase: k * 1.7,
      bobRate: 0.35 + (k % 4) * 0.11,
    })
  })
  placeItems()
}
function placeItems() {
  drift.forEach((d, k) => {
    const el = itemEls.value[k]
    if (!el) return
    const bob = reducedMotion.value ? 0 : 3 * Math.sin(driftClock * d.bobRate * Math.PI * 2 + d.phase)
    el.style.transform = `translate3d(${d.x.toFixed(2)}px, ${(d.baseY + bob).toFixed(2)}px, 0)`
  })
}
function onTick(_t: number, deltaMs: number) {
  if (reducedMotion.value) return
  const dt = Math.min(deltaMs, 100) / 1000
  driftClock += dt
  for (const d of drift) {
    d.x += d.speed * dt
    if (d.speed > 0 && d.x > vw) d.x = -d.width
    else if (d.speed < 0 && d.x < -d.width) d.x = vw
  }
  placeItems()
}
function onResize() {
  layoutItems()
  drawWindow()
}

// ── Choreography ──
let ctx: gsap.Context | null = null
let intro: gsap.core.Timeline | null = null
let grow: gsap.core.Timeline | null = null
let latest: gsap.core.Tween | null = null
let introDone = false
let growing = false
let finished = false
let variant: 'first' | 'repeat' | 'static' = 'first'
const world = { inflate: 0, dolly: 0.85 }
const fontsReady = ref(false)

function pushWorld() {
  props.world?.setInflate(world.inflate)
  props.world?.setDolly(world.dolly)
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage blocked: every visit is a first visit */
  }
}
function seenBefore() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function finish(kind: RevealKind) {
  if (finished) return
  finished = true
  markSeen()
  world.inflate = 1
  world.dolly = 1
  pushWorld()
  active.value = false
  emit('reveal', kind)
  // Release scroll once the hero has settled.
  gsap.delayedCall(kind === 'play' ? 1.25 : 0.3, () => {
    lenis.start()
    emit('done')
  })
}

/** Stages from the portrait card to full screen (desktop: square → landscape → full; mobile: full). */
function startGrow() {
  if (growing || finished) return
  growing = true
  latest?.kill()
  const repeat = variant === 'repeat'
  ctx?.add(() => {
    grow = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onUpdate: drawWindow, onComplete: () => finish(repeat ? 'fast' : 'play') })
    if (isMobile.value) {
      grow.to(win, { w: 1, h: 1, r: 0, duration: repeat ? 0.55 : 0.9 })
    } else if (repeat) {
      grow
        .to(win, { w: 0.34, h: 0.62, duration: 0.2 })
        .to(win, { w: 0.72, h: 0.66, duration: 0.22 })
        .to(win, { w: 1, h: 1, r: 0, duration: 0.3 })
    } else {
      grow
        .to(win, { w: 0.34, h: 0.62, duration: 0.4 })
        .to(win, { w: 0.72, h: 0.66, duration: 0.55 }, '+=0.12')
        .to(win, { w: 1, h: 1, r: 0, duration: 0.65 }, '+=0.12')
    }
    // The material swells and smooths, and the camera settles back, as the window opens.
    const span = grow.duration()
    grow.to(world, { inflate: 1, duration: span, ease: repeat ? 'power2.out' : 'power1.inOut', onUpdate: pushWorld }, 0)
    grow.to(world, { dolly: 1, duration: span, ease: 'power2.inOut', onUpdate: pushWorld }, 0)
  })
}
function maybeGrow() {
  if (introDone && props.ready && fontsReady.value) startGrow()
}

function buildFirst() {
  intro = gsap.timeline({ onUpdate: drawWindow, onComplete: () => ((introDone = true), maybeGrow()) })
  intro.fromTo(itemEls.value, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0)
  // Bar: 42 px × 62 % enters from the left edge and slides to the centre…
  intro.set(win, { cx: 0, cxPx: -21, w: 0, wPx: 42, h: 0.62, r: 0 }, 0.6)
  intro.to(win, { cx: 0.5, cxPx: 0, duration: 0.9, ease: 'power3.inOut' }, 0.6)
  // …then widens into the portrait card (rounded 6 px).
  const portrait = isMobile.value ? 0.56 : 0.22
  intro.to(win, { w: portrait, wPx: 0, r: 6, duration: 0.6, ease: 'power3.inOut' }, 1.5)
}

function buildRepeat() {
  // No words: the bar appears at the centre and opens straight away (1.1 s in all).
  intro = gsap.timeline({ onUpdate: drawWindow, onComplete: () => ((introDone = true), maybeGrow()) })
  intro.set(win, { cx: 0.5, cxPx: 0, w: 0, wPx: 42, h: 0, r: 0 }, 0)
  intro.to(win, { h: 0.62, duration: 0.15, ease: 'power3.out' }, 0)
  intro.to(win, { w: isMobile.value ? 0.56 : 0.22, wPx: 0, r: 6, duration: 0.23, ease: 'power3.inOut' }, 0.15)
  // Speed the inflation up to match.
  intro.to(world, { inflate: 0.25, duration: 0.38, ease: 'power1.in', onUpdate: pushWorld }, 0)
}

function buildStatic() {
  // Reduced motion: words still for 1 s, then the white crossfades away onto the inflated hero.
  world.inflate = 1
  world.dolly = 1
  pushWorld()
  gsap.set(itemEls.value, { autoAlpha: 1 })
  intro = gsap.timeline()
  intro.to(layer.value, { autoAlpha: 0, duration: 0.6, ease: 'power1.inOut', onComplete: () => finish('static') }, 1)
}

function skip() {
  if (finished || variant === 'static') return
  intro?.kill()
  grow?.kill()
  latest?.kill()
  growing = true
  ctx?.add(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.3, ease: 'power2.inOut' }, onUpdate: drawWindow, onComplete: () => finish('fast') })
    // From wherever we are (even before the bar arrived) to full screen.
    if (win.w * vw + win.wPx < 1) gsap.set(win, { cx: 0.5, cxPx: 0, wPx: 0, h: 0.62 })
    tl.to(win, { cx: 0.5, cxPx: 0, w: 1, wPx: 0, h: 1, r: 0 }, 0)
    tl.to(world, { inflate: 1, dolly: 1, onUpdate: pushWorld }, 0)
  })
}

function start() {
  const forced = props.mode
  if (forced === 'off') {
    finish('static')
    return
  }
  variant = reducedMotion.value ? 'static' : forced === 'repeat' || (forced === 'auto' && seenBefore()) ? 'repeat' : 'first'
  layoutItems()
  world.inflate = 0
  world.dolly = 0.85
  if (variant !== 'static') pushWorld()
  ctx = gsap.context(() => {
    if (variant === 'first') buildFirst()
    else if (variant === 'repeat') buildRepeat()
    else buildStatic()
    // Never hold longer than this, assets or not.
    if (variant !== 'static') latest = gsap.delayedCall(LATEST_GROW, () => ((introDone = true), startGrow()))
  }, layer.value ?? undefined)
}

watch(
  () => props.ready,
  () => maybeGrow(),
)
watch(fontsReady, () => maybeGrow())
// The clock label's width can change on the minute: re-measure for wrapping.
watch(timeText, () => nextTick(() => drift.forEach((d, k) => (d.width = itemEls.value[k]?.offsetWidth ?? d.width))))

onMounted(async () => {
  if (import.meta.dev) {
    // Review/verification: window.__openingTimeScale (set before load) plays the opening in slow motion.
    const w = window as Window & { __openingTimeScale?: number; __opening?: () => object }
    if (w.__openingTimeScale) gsap.globalTimeline.timeScale(w.__openingTimeScale)
    w.__opening = () => ({ ...win, vw, vh, variant, introDone, growing, finished, active: active.value, ready: props.ready })
  }
  lenis.stop()
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('pointerdown', skip)
  window.addEventListener('keydown', skip)
  gsap.ticker.add(onTick)
  // Words must be in their real typeface before they are seen (no swap mid-fade).
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 800))])
  fontsReady.value = true
  await nextTick()
  start()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointerdown', skip)
  window.removeEventListener('keydown', skip)
  gsap.ticker.remove(onTick)
  latest?.kill()
  ctx?.revert()
  if (!finished) lenis.start()
})

defineExpose({ skip })
</script>

<template>
  <div v-if="active" ref="layer" class="opening" aria-hidden="true">
    <span
      v-for="it in items"
      :key="it.id"
      ref="itemEls"
      class="item"
      :class="it.kind"
      >{{ it.id === 'time' ? timeText : it.text }}</span
    >
  </div>
</template>

<style scoped>
.opening {
  position: fixed;
  inset: 0;
  z-index: 900;
  overflow: hidden;
  background: var(--paper-raised);
  color: var(--ink);
  /* Clicks fall through to the skip listener on window; nothing here is interactive. */
  user-select: none;
}

.item {
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
  will-change: transform;
  /* Hidden until the timeline fades them in (no flash before fonts are ready). */
  visibility: hidden;
}

.word {
  font-family: var(--font-display);
  font-weight: 300;
  /* 84 px at 1440 wide. */
  font-size: clamp(48px, 5.83vw, 84px);
  line-height: 1;
  letter-spacing: -0.015em;
  translate: 0 -50%;
}

.label {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  translate: 0 -50%;
}

@media (max-width: 767px) {
  .word {
    font-size: 48px;
  }
}
</style>
