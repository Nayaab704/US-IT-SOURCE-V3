<script setup lang="ts">
import { gsap } from 'gsap'
import { projectsParams, type Project, type ProjectScreen } from '~/data/projects'

/**
 * The project's screens (F1). `stream`: two rows flowing right → left on a plane tilted in 3D, each
 * row a set of screens cloned until it covers twice the width and wrapped modulo the set's width.
 * `scroller` (phones, reduced motion): one native horizontal scroller, no motion.
 * Swapping `project` slides the old screens out to the left and the new ones in from the right.
 */
const props = defineProps<{
  project: Project
  mode: 'stream' | 'scroller'
  /** The section is on screen: the stream runs only then. */
  running: boolean
  /** Scroll speed (px/s, signed) for the boost. */
  velocity: () => number
  reduced: boolean
}>()
const emit = defineEmits<{ open: [screens: ProjectScreen[], index: number, from: HTMLElement] }>()

const P = projectsParams.stream
const shown = shallowRef(props.project)
const viewport = ref<HTMLElement | null>(null)
const rowsEl = ref<HTMLElement | null>(null)
const setEls = ref<HTMLElement[]>([])
const cursor = ref<HTMLElement | null>(null)
const copies = ref(3)
/** Image aspect (w / h) once loaded, keyed by src: portrait images get the phone frame. */
const aspects = reactive<Record<string, number>>({})

const isMobileFrame = (s: ProjectScreen) => (s.src && aspects[s.src] ? aspects[s.src]! < 0.9 : s.mobile)
const aspectOf = (s: ProjectScreen) => (s.src && aspects[s.src] ? aspects[s.src]! : isMobileFrame(s) ? 9 / 19.5 : 16 / 10)
/** Bottom row starts half-way through the set, so the two rows never line up. */
const rows = computed(() => {
  const s = shown.value.screens
  const half = Math.floor(s.length / 2)
  return [s.map((x, i) => ({ s: x, i })), [...s.slice(half), ...s.slice(0, half)].map((x, k) => ({ s: x, i: (k + half) % s.length }))]
})

const offsets = [0, 0]
const setWidths = [1, 1]
let hovered = false
let hoverK = 1
let boost = 0

function measure() {
  if (props.mode !== 'stream') return
  const w = viewport.value?.offsetWidth ?? 1
  setEls.value.forEach((el, r) => (setWidths[r] = Math.max(1, el.offsetWidth)))
  const need = Math.ceil((w * 2) / Math.min(...setWidths)) + 1
  if (need !== copies.value) copies.value = Math.min(12, need)
}

function onLoad(e: Event, s: ProjectScreen) {
  const img = e.target as HTMLImageElement
  if (s.src && img.naturalWidth) aspects[s.src] = img.naturalWidth / img.naturalHeight
  nextTick(measure)
}

function tick(_t: number, deltaMs: number) {
  if (props.mode !== 'stream' || !props.running || !rowsEl.value) return
  const dt = Math.min(deltaMs / 1000, 0.05)
  // Scroll speeds the stream up at once; it eases back over ~boostEase seconds.
  const target = Math.min(P.boostMax, Math.abs(props.velocity()) * P.boostPerPx)
  boost = target > boost ? boost + (target - boost) * Math.min(1, dt * 10) : boost * Math.exp(-dt / Math.max(0.05, P.boostEase / 3))
  hoverK += ((hovered ? P.hoverSlow : 1) - hoverK) * Math.min(1, dt * 4)
  const speed = P.speed * hoverK * (1 + boost)
  const tracks = rowsEl.value.querySelectorAll<HTMLElement>('.ps-track')
  tracks.forEach((el, r) => {
    offsets[r] = (offsets[r]! + speed * (r === 0 ? 1 : P.bottomRow) * dt) % setWidths[r]!
    el.style.transform = `translate3d(${(-offsets[r]!).toFixed(2)}px, 0, 0)`
  })
}

function onMove(e: PointerEvent) {
  if (cursor.value) cursor.value.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
}
function setHover(on: boolean) {
  hovered = on
  cursor.value?.classList.toggle('is-on', on)
}

function open(i: number, e: Event) {
  emit('open', shown.value.screens, i, e.currentTarget as HTMLElement)
}

// Project swap: out to the left (0.5 s), in from the right (0.6 s, power3.out).
let swapping: gsap.core.Timeline | null = null
watch(
  () => props.project,
  (next) => {
    swapping?.kill()
    const el = rowsEl.value
    if (!el || props.reduced) {
      shown.value = next
      nextTick(measure)
      return
    }
    swapping = gsap
      .timeline()
      .to(el, { x: -80, autoAlpha: 0, duration: 0.5, ease: 'power2.in' })
      .add(() => {
        shown.value = next
        offsets[0] = offsets[1] = 0
        if (viewport.value) viewport.value.scrollLeft = 0
        return nextTick(measure)
      })
      .fromTo(el, { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' })
  },
)

let ro: ResizeObserver | null = null
onMounted(() => {
  gsap.ticker.add(tick)
  ro = new ResizeObserver(() => measure())
  if (viewport.value) ro.observe(viewport.value)
  nextTick(measure)
})
watch(() => props.mode, () => nextTick(measure))
// Off screen: no hover state and no "View" cursor left behind.
watch(
  () => props.running,
  (on) => !on && setHover(false),
)
onBeforeUnmount(() => {
  gsap.ticker.remove(tick)
  ro?.disconnect()
  swapping?.kill()
})

const frameStyle = (s: ProjectScreen) => ({ aspectRatio: String(aspectOf(s)) })
</script>

<template>
  <div class="ps-wrap" @pointermove="onMove">
  <div
    ref="viewport"
    class="ps"
    :class="[`is-${mode}`]"
    :style="{ '--ps-perspective': `${P.perspective}px`, '--ps-tilt': `${-P.tilt}deg` }"
  >
    <div class="ps-plane">
      <div ref="rowsEl" class="ps-rows">
        <!-- Stream: two rows; every copy after the first is decorative. -->
        <template v-if="mode === 'stream'">
          <div v-for="(row, r) in rows" :key="`${shown.slug}-${r}`" class="ps-row">
            <div class="ps-track">
              <div v-for="c in copies" :key="c" :ref="c === 1 ? (el) => el && (setEls[r] = el as HTMLElement) : undefined" class="ps-set" :aria-hidden="c > 1 || r > 0 ? 'true' : undefined">
                <button
                  v-for="it in row"
                  :key="`${c}-${it.i}`"
                  type="button"
                  class="ps-screen"
                  :class="{ 'is-phone': isMobileFrame(it.s) }"
                  :style="frameStyle(it.s)"
                  :tabindex="c > 1 || r > 0 ? -1 : 0"
                  :aria-label="`Open ${it.s.label}`"
                  @click="open(it.i, $event)"
                  @pointerenter="setHover(true)"
                  @pointerleave="setHover(false)"
                >
                  <span class="ps-face">
                    <img v-if="it.s.src" :src="it.s.src" alt="" loading="lazy" decoding="async" draggable="false" @load="onLoad($event, it.s)" />
                    <span v-else class="ps-ph">[{{ it.s.label }}]</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </template>
        <!-- Scroller: one row of the screens, swiped natively. -->
        <div v-else class="ps-row">
          <div class="ps-set">
            <button
              v-for="(s, i) in shown.screens"
              :key="`${shown.slug}-${i}`"
              type="button"
              class="ps-screen"
              :class="{ 'is-phone': isMobileFrame(s) }"
              :style="frameStyle(s)"
              :aria-label="`Open ${s.label}`"
              @click="open(i, $event)"
            >
              <span class="ps-face">
                <img v-if="s.src" :src="s.src" alt="" loading="lazy" decoding="async" draggable="false" @load="onLoad($event, s)" />
                <span v-else class="ps-ph">[{{ s.label }}]</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- In <body>: a perspective / transformed ancestor would become the containing block of this fixed label. -->
  <ClientOnly>
    <Teleport to="body">
      <div v-if="mode === 'stream'" ref="cursor" class="ps-cursor" aria-hidden="true">View</div>
    </Teleport>
  </ClientOnly>
  </div>
</template>

<style scoped>
.ps-wrap {
  height: 100%;
}

.ps {
  --row-h: clamp(170px, 25vh, 270px);
  position: relative;
  height: 100%;
  perspective: var(--ps-perspective);
  perspective-origin: 30% 50%;
}

.ps.is-stream {
  overflow: hidden;
  /* Fade the stream in and out at its edges instead of a hard cut. */
  mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 94%, transparent 100%);
}

.ps-plane {
  height: 100%;
  display: flex;
  align-items: center;
}

.is-stream .ps-plane {
  transform: rotateY(var(--ps-tilt));
  transform-origin: 100% 50%;
}

.ps-rows {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
}

.ps-row {
  overflow: visible;
}

.is-stream .ps-row + .ps-row {
  /* Staggered: the bottom row sits half a card in. */
  margin-left: 6%;
}

.ps-track {
  display: flex;
  width: max-content;
  will-change: transform;
}

.ps-set {
  display: flex;
  gap: 28px;
  padding-right: 28px;
}

.ps-screen {
  position: relative;
  flex: none;
  height: var(--row-h);
  padding: 0;
  border: 0;
  background: none;
  cursor: none;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * Soft shadow under each screen: a gradient (cheap to rasterise — a blurred box-shadow on every
 * card stalled the compositor for ~100 ms when the stream first appeared). Grows on hover.
 */
.ps-screen::before {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -22px;
  height: 44px;
  z-index: -1;
  background: radial-gradient(50% 50% at 50% 50%, rgba(22, 24, 29, 0.26), rgba(22, 24, 29, 0) 100%);
  transition:
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.6s;
  opacity: 0.85;
}

.ps-face {
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: var(--paper-raised);
  overflow: hidden;
}

.ps-screen:hover,
.ps-screen:focus-visible {
  transform: scale(1.06);
  z-index: 1;
}

.ps-screen:hover::before,
.ps-screen:focus-visible::before {
  transform: translateY(10px) scaleX(1.12) scaleY(1.4);
  opacity: 1;
}

.ps-screen:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 4px;
}

/* Minimal phone: rounded, thin dark bezel; no notch, no status bar. */
.ps-screen.is-phone .ps-face {
  border: 0;
  border-radius: 36px;
  padding: 6px;
  background: #111214;
}

.ps-screen.is-phone .ps-face > * {
  border-radius: 30px;
  overflow: hidden;
}

.ps-screen img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
}

.ps-ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 12px;
  background: #e6e3dc;
  color: #55544f;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-align: center;
}

.ps-cursor {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-sans);
  font-size: 13px;
  pointer-events: none;
  opacity: 0;
  scale: 0.6;
  transition:
    opacity 0.25s,
    scale 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.ps-cursor.is-on {
  opacity: 1;
  scale: 1;
}

/* ── Scroller (phones, reduced motion) ── */
.ps.is-scroller {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  perspective: none;
}

.ps.is-scroller::-webkit-scrollbar {
  display: none;
}

.is-scroller .ps-set {
  padding: 24px 0;
}

.is-scroller .ps-screen {
  scroll-snap-align: start;
  cursor: pointer;
}

@media (max-width: 767px) {
  .ps {
    --row-h: 30vh;
  }
}
</style>
