<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { services, servicesParams } from '~/data/services'

/**
 * "Five ways we build around you" (F2). Desktop: one pin, scrubbed; every element is a pure function
 * of the timeline position t (viewport heights), so it is exactly reversible. Chapter k starts at
 * s_k = intro + k·chapter and takes `transition` to come in: the photo wipes up from the bottom
 * (feathered mask) over the previous one, which shrinks a touch; the old name passes behind glass,
 * the new one rises; the side visual swaps; the white pill highlight slides to its service.
 * Phones: no pin — a sequence of full-screen cards. Reduced motion: same pin, crossfades only.
 */
type GlassHandle = { setExit: (progress: number) => void }

const props = withDefaults(defineProps<{ refreshPriority?: number }>(), { refreshPriority: 1 })
const root = ref<HTMLElement | null>(null)
const section = ref<HTMLElement | null>(null)
const introTitle = ref<GlassHandle | null>(null)
const pillsEl = ref<HTMLElement | null>(null)
const highlight = ref<HTMLElement | null>(null)

// Per-chapter element refs (index = chapter).
const layers: HTMLElement[] = []
const bgs: HTMLElement[] = []
const nameWraps: HTMLElement[] = []
const names: (GlassHandle | null)[] = []
const lines: HTMLElement[] = []
const visuals: HTMLElement[] = []
const pills: HTMLElement[] = []
const setEl = (arr: HTMLElement[], i: number) => (el: unknown) => {
  if (el instanceof HTMLElement) arr[i] = el
}
const setGlass = (i: number) => (el: unknown) => {
  names[i] = (el as GlassHandle | null) ?? null
}

const prefersReduced = useReducedMotion()
const device = useDevice()
const mounted = ref(false)
const reducedMotion = computed(() => mounted.value && prefersReduced.value)
const isMobile = computed(() => mounted.value && device.isMobile.value)
const { scrollTo } = useLenis()

const active = ref(-1)
const progress = reactive(services.map(() => 0))
const state = { t: 0 }
let ctx: gsap.Context | null = null
let pinTrigger: ScrollTrigger | null = null

const P = servicesParams
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ease2 = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const ease3out = (x: number) => 1 - (1 - x) ** 3
const startOf = (k: number) => P.pin.intro + k * P.pin.chapter
const total = () => P.pin.intro + services.length * P.pin.chapter + P.pin.outro

/** Pill rects (relative to the pill list), measured on refresh. */
let pillRects: { y: number; w: number; h: number }[] = []
function measurePills() {
  pillRects = pills.map((p) => ({ y: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight }))
}

/** The feathered wipe: a mask 2.2 screens tall (transparent above, opaque below) sliding up. */
function setWipe(el: HTMLElement, w: number) {
  if (w >= 1) {
    el.style.maskImage = el.style.webkitMaskImage = ''
    return
  }
  const H = window.innerHeight
  const band = P.feather / 2.2 / 2
  const g = `linear-gradient(to bottom, transparent ${(50 - band * 100).toFixed(2)}%, #000 ${(50 + band * 100).toFixed(2)}%)`
  el.style.maskImage = el.style.webkitMaskImage = g
  el.style.maskSize = el.style.webkitMaskSize = '100% 220%'
  el.style.maskRepeat = el.style.webkitMaskRepeat = 'no-repeat'
  // w = 0: the mask's transparent half covers the screen; w = 1: its opaque half does (the feathered
  // band has passed the top edge).
  const y = -(0.5 + band) * 2.2 * H * w
  el.style.maskPosition = el.style.webkitMaskPosition = `0 ${y.toFixed(1)}px`
}

function render() {
  const t = state.t
  const T = P.pin.transition
  const reduced = reducedMotion.value
  const n = services.length
  // Reduced motion: text and side visuals switch at the chapter midpoint (with a short CSS fade) instead of
  // following the scroll, so stopping between chapters never leaves two titles half-visible on top of each other.
  const step = (x: number) => (reduced ? (x >= 0.5 ? 1 : 0) : x)
  // visibility transitions too: it stays visible for the whole fade-out, then hides.
  const fade = reduced ? 'opacity 0.25s ease, visibility 0.25s' : ''
  let current = -1
  // Intro title passes behind glass as the first photo comes up.
  introTitle.value?.setExit(clamp01((t - P.pin.intro) / (T * 0.8)))

  for (let k = 0; k < n; k++) {
    const s = startOf(k)
    const wipe = clamp01((t - s) / T)
    const out = k < n - 1 ? clamp01((t - startOf(k + 1)) / T) : 0
    if (wipe >= 0.5) current = k
    const layer = layers[k]
    const bg = bgs[k]
    if (!layer || !bg) continue
    const visible = wipe > 0 && out < 1
    // Only the NEXT chapter is "shown" ahead at opacity 0.001 (invisible, but rasterised and its photo
    // uploaded) during the current hold; keeping all five warm cost steady frame time for nothing.
    const warm = !visible && out < 1 && (k === 0 ? t < s : t >= startOf(k - 1) + T)
    layer.style.visibility = visible || warm ? 'visible' : 'hidden'
    if (warm) {
      layer.style.opacity = '0.001'
      setWipe(layer, 1)
      bg.style.transform = `scale(${P.kenBurns.from})`
    }
    if (visible) {
      if (reduced) {
        layer.style.opacity = String(wipe)
        setWipe(layer, 1)
        bg.style.transform = `scale(${P.kenBurns.from})`
      } else {
        layer.style.opacity = '1'
        setWipe(layer, ease2(wipe))
        const kb = clamp01((t - s) / (P.pin.chapter + T))
        const scale = (P.kenBurns.from + (P.kenBurns.to - P.kenBurns.from) * kb) * (1 + (P.kenBurns.outgoing - 1) * ease2(out))
        bg.style.transform = `scale(${scale.toFixed(4)})`
      }
    }

    // Chapter progress after its entrance (the staff cards fan out as it arrives).
    progress[k] = services[k]!.visual === 'cards' ? ease2(clamp01((t - s - T * 0.25) / (T * 0.8))) : clamp01((t - s - T) / (P.pin.chapter - T))

    // Name: rises in from below; leaves behind glass.
    const nameIn = reduced ? step(wipe) : ease3out(clamp01((t - s - 0.04) / (T * 0.8)))
    const nameOut = reduced ? step(out) : clamp01((t - startOf(k + 1)) / (T * 0.8))
    const nw = nameWraps[k]
    if (nw) {
      nw.style.visibility = nameIn > 0 && !(k < n - 1 && nameOut >= 1) ? 'visible' : 'hidden'
      nw.style.transition = fade
      nw.style.opacity = nameIn.toFixed(3)
      nw.style.transform = reduced ? '' : `translate3d(0, ${((1 - nameIn) * 60).toFixed(1)}px, 0)`
    }
    if (k < n - 1) names[k]?.setExit(reduced ? 0 : nameOut)
    if (reduced && nw && k < n - 1) nw.style.opacity = (nameIn * (1 - nameOut)).toFixed(3)

    // Line + scope: a quick fade swap.
    const ln = lines[k]
    if (ln) {
      const o = reduced
        ? step(wipe) * (1 - step(out))
        : clamp01((t - s - 0.08) / (T * 0.5)) * (1 - clamp01((t - startOf(k + 1)) / (T * 0.4)) * (k < n - 1 ? 1 : 0))
      ln.style.opacity = o.toFixed(3)
      ln.style.visibility = o > 0.001 ? 'visible' : 'hidden'
      ln.style.transition = fade
    }

    // Side visual: old slides up and fades; new rises in ~120 ms (≈ 0.025 vh) later.
    const vis = visuals[k]
    if (vis) {
      const vin = reduced ? step(wipe) : ease3out(clamp01((t - s - 0.06 - 0.025) / (T * 0.8)))
      const vout = k < n - 1 ? (reduced ? step(out) : ease2(clamp01((t - startOf(k + 1)) / (T * 0.7)))) : 0
      const o = vin * (1 - vout)
      vis.style.opacity = o.toFixed(3)
      vis.style.visibility = o > 0.001 ? 'visible' : 'hidden'
      vis.style.transition = fade
      vis.style.transform = reduced ? '' : `translate3d(0, ${((1 - vin) * 50 - vout * 70).toFixed(1)}px, 0)`
    }
  }

  // Pill highlight: slides from the previous pill to the incoming one during each transition.
  const hl = highlight.value
  if (hl && pillRects.length === n) {
    let from = 0
    let to = 0
    let f = 0
    let alpha = 0
    for (let k = 0; k < n; k++) {
      const w = clamp01((t - startOf(k)) / T)
      if (w <= 0) break
      if (k === 0) {
        alpha = w
        from = to = 0
        f = 1
      } else {
        from = k - 1
        to = k
        f = ease2(w)
      }
    }
    const a = pillRects[from]!
    const b = pillRects[to]!
    hl.style.opacity = alpha.toFixed(3)
    hl.style.transform = `translate3d(0, ${(a.y + (b.y - a.y) * f).toFixed(1)}px, 0)`
    hl.style.width = `${(a.w + (b.w - a.w) * f).toFixed(1)}px`
    hl.style.height = `${a.h}px`
  }
  if (current !== active.value) active.value = current
}

// Image decode ahead of time: a first decode during a wipe would stall the frame.
function predecode() {
  root.value?.querySelectorAll<HTMLImageElement>('.sv-bg img').forEach((img) => void img.decode?.().catch(() => {}))
}

function buildTimeline() {
  const sec = section.value
  if (!sec) return
  pinTrigger = null
  ScrollTrigger.create({ trigger: root.value, start: 'top bottom+=100%', once: true, onEnter: predecode })
  if (isMobile.value) {
    buildMobile()
    return
  }
  measurePills()
  state.t = 0
  render()
  const len = total()
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * len}`,
      scrub: P.pin.scrub,
      invalidateOnRefresh: true,
      refreshPriority: props.refreshPriority,
      onRefresh: () => {
        measurePills()
        render()
      },
    },
  })
  pinTrigger = tl.scrollTrigger ?? null
  tl.to(state, { t: len, duration: len, onUpdate: render }, 0)
}

/** Phones: each card scrubs its own Ken Burns; the sticky pill row follows the cards. */
function buildMobile() {
  const cards = root.value?.querySelectorAll<HTMLElement>('.svm-card') ?? []
  cards.forEach((card, k) => {
    const bg = card.querySelector<HTMLElement>('.sv-bg')
    ScrollTrigger.create({
      trigger: card,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (st) => {
        if (bg && !reducedMotion.value) bg.style.transform = `scale(${(P.kenBurns.from + (P.kenBurns.to - P.kenBurns.from) * st.progress).toFixed(4)})`
        progress[k] = clamp01((st.progress - 0.3) / 0.4)
      },
    })
    ScrollTrigger.create({
      trigger: card,
      start: 'top center',
      end: 'bottom center',
      onToggle: (st) => st.isActive && (active.value = k),
    })
  })
}

function rebuild() {
  ctx?.revert()
  active.value = -1
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

function goTo(k: number) {
  if (isMobile.value) {
    const card = root.value?.querySelectorAll<HTMLElement>('.svm-card')[k]
    if (card) scrollTo(card, { duration: 1.2 })
    return
  }
  if (!pinTrigger) return
  scrollTo(pinTrigger.start + (startOf(k) + P.pin.transition) * window.innerHeight, { duration: 1.4 })
}

// Dev tuning.
let paneFolder: { dispose(): void } | null = null
async function buildPane() {
  const pane = await useDevPane()
  if (!pane) return
  const f = pane.addFolder({ title: 'services', expanded: false })
  paneFolder = f
  f.addBinding(P.pin, 'chapter', { label: 'chapter (vh)', min: 0.5, max: 2, step: 0.05 }).on('change', rebuild)
  f.addBinding(P.pin, 'transition', { label: 'transition (vh)', min: 0.1, max: 0.6, step: 0.01 }).on('change', rebuild)
  f.addBinding(P.pin, 'intro', { label: 'intro (vh)', min: 0, max: 1, step: 0.05 }).on('change', rebuild)
  f.addBinding(P.pin, 'outro', { label: 'outro (vh)', min: 0, max: 1, step: 0.05 }).on('change', rebuild)
  f.addBinding(P.kenBurns, 'from', { label: 'ken burns from', min: 1, max: 1.2, step: 0.005 })
  f.addBinding(P.kenBurns, 'to', { label: 'ken burns to', min: 1, max: 1.3, step: 0.005 })
  f.addBinding(P, 'feather', { label: 'wipe feather', min: 0.02, max: 0.4, step: 0.01 })
  f.addBinding(P, 'crossfade', { label: 'screens every (s)', min: 0.6, max: 5, step: 0.1 })
  f.addBinding(P.fan, 'angle', { label: 'cards fan (°)', min: 0, max: 15, step: 0.5 })
  f.addBinding(P.fan, 'spread', { label: 'cards spread (px)', min: 0, max: 120, step: 1 })
  for (const s of services) f.addBinding(s.grade, 'opacity', { label: `${s.slug} grade`, min: 0, max: 1, step: 0.01 })
}

onMounted(() => {
  mounted.value = true
  // The phone / reduced variants switch in after mount: build once their DOM is there.
  if (prefersReduced.value || device.isMobile.value) nextTick(rebuild)
  else rebuild()
  void buildPane()
})
watch([reducedMotion, isMobile], () => nextTick(rebuild))
onBeforeUnmount(() => {
  ctx?.revert()
  paneFolder?.dispose()
})

const bgStyle = (aspect: number) => ({ '--aspect': String(aspect) })
const gradeStyle = (s: (typeof services)[number]) => ({ background: s.grade.color, mixBlendMode: s.grade.blend, opacity: String(s.grade.opacity) })
</script>

<template>
  <div id="services" ref="root" class="sv-root" :class="{ 'is-mobile': isMobile }" data-world="night">
    <!-- ── Desktop / reduced motion: one pinned stage of five chapters ── -->
    <section v-if="!isMobile" ref="section" class="sv" aria-labelledby="sv-title">
      <div class="sv-base grain" aria-hidden="true" />

      <div v-for="(s, k) in services" :key="s.slug" :ref="setEl(layers, k)" class="sv-layer" :style="{ zIndex: k + 1 }" aria-hidden="true">
        <div :ref="setEl(bgs, k)" class="sv-bg" :style="bgStyle(s.aspect)">
          <picture v-if="s.bg.length">
            <source v-for="src in s.sources" :key="src.srcset" :srcset="src.srcset" :type="src.type" sizes="100vw" />
            <img :src="s.bg[s.bg.length - 1]" alt="" loading="lazy" decoding="async" />
          </picture>
          <div v-else class="sv-ph-bg grain" />
          <div class="sv-grade" :style="gradeStyle(s)" />
        </div>
        <div class="sv-legible" />
      </div>

      <div class="sv-intro">
        <UiGlassText ref="introTitle" id="sv-title" as="h2" exit-mode="manual" class="sv-intro-title">Five ways we build around you.</UiGlassText>
      </div>

      <nav ref="pillsEl" class="sv-pills" aria-label="Services">
        <span ref="highlight" class="sv-pill-hl" aria-hidden="true" />
        <button
          v-for="(s, k) in services"
          :key="s.slug"
          :ref="setEl(pills, k)"
          type="button"
          class="sv-pill"
          :class="{ on: active === k }"
          :aria-current="active === k ? 'true' : undefined"
          @click="goTo(k)"
        >
          {{ s.name }}
        </button>
      </nav>

      <div v-for="(s, k) in services" :key="`t-${s.slug}`" class="sv-chapter-text">
        <div :ref="setEl(nameWraps, k)" class="sv-name-wrap">
          <UiGlassText :ref="setGlass(k)" as="h3" exit-mode="manual" class="sv-name">{{ s.name }}</UiGlassText>
        </div>
        <div :ref="setEl(lines, k)" class="sv-copy">
          <p class="sv-line">{{ s.line }}</p>
          <p v-if="s.scope" class="sv-scope">{{ s.scope }}</p>
        </div>
        <div v-if="s.visual !== 'none'" :ref="setEl(visuals, k)" class="sv-visual">
          <ScenesServicesServiceVisual :service="s" :active="active === k" :progress="s.visual === 'cards' ? (progress[k] ?? 0) : 0" :reduced="reducedMotion" />
        </div>
      </div>
    </section>

    <!-- ── Phones: full-screen cards in sequence, a sticky pill row on top ── -->
    <section v-else class="svm" aria-labelledby="svm-title">
      <h2 id="svm-title" class="svm-title">Five ways we build around you.</h2>
      <nav class="svm-pills" aria-label="Services">
        <button v-for="(s, k) in services" :key="s.slug" type="button" class="sv-pill" :class="{ on: active === k }" :aria-current="active === k ? 'true' : undefined" @click="goTo(k)">
          {{ s.name }}
        </button>
      </nav>
      <article v-for="s in services" :key="s.slug" class="svm-card">
        <div class="svm-photo" aria-hidden="true">
          <div class="sv-bg" :style="bgStyle(s.aspect)">
            <picture v-if="s.bg.length">
              <source v-for="src in s.sources" :key="src.srcset" :srcset="src.srcset" :type="src.type" sizes="100vw" />
              <img :src="s.bg[s.bg.length - 1]" alt="" loading="lazy" decoding="async" />
            </picture>
            <div v-else class="sv-ph-bg grain" />
            <div class="sv-grade" :style="gradeStyle(s)" />
          </div>
          <div class="sv-legible" />
        </div>
        <div class="svm-body">
          <p class="sv-line">{{ s.line }}</p>
          <h3 class="sv-name">{{ s.name }}</h3>
          <div v-if="s.visual !== 'none'" class="svm-visual">
            <ScenesServicesServiceVisual :service="s" :active="active === services.indexOf(s)" :progress="s.visual === 'cards' ? (progress[services.indexOf(s)] ?? 0) : 0" :reduced="reducedMotion" />
          </div>
          <p v-if="s.scope" class="sv-scope">{{ s.scope }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.sv-root {
  --graphite: #1a1b1e;
  /* Fine static grain: an SVG noise tile, rasterised once. */
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  position: relative;
  background: var(--graphite);
  color: #fff;
}

.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--grain);
  opacity: 0.07;
  pointer-events: none;
}

.sv {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

.sv-base {
  position: absolute;
  inset: 0;
  background: var(--graphite);
}

.sv-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  visibility: hidden;
}

/* The photo's own box, covering the viewport at the photo's aspect. */
.sv-bg {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100%, calc(100vh * var(--aspect)));
  aspect-ratio: var(--aspect);
  min-height: 100%;
  translate: -50% -50%;
  transform-origin: 50% 50%;
  will-change: transform;
}

.sv-bg picture,
.sv-bg img,
.sv-ph-bg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-ph-bg {
  background: var(--graphite);
}

.sv-grade {
  position: absolute;
  inset: 0;
}

/*
 * Text always reads (WCAG ≥ 4.5:1 against the 90th-percentile background luminance, measured per
 * chapter): dark from the name's side and the bottom, plus local scrims behind the line (top-right),
 * the scope (bottom-right) and the pill menu (left).
 */
.sv-legible {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(40% 34% at 86% 15%, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0) 100%),
    radial-gradient(38% 30% at 90% 92%, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0) 100%),
    radial-gradient(30% 42% at 6% 34%, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0) 100%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0) 64%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.25) 26%, rgba(0, 0, 0, 0) 44%);
}

.sv-intro {
  position: absolute;
  left: var(--gutter);
  right: var(--gutter);
  top: 56%;
  z-index: 10;
}

.sv-intro-title {
  margin: 0;
  max-width: 900px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 72px;
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.sv-pills {
  position: absolute;
  left: var(--gutter);
  top: 22vh;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.sv-pill {
  position: relative;
  z-index: 1;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.3s,
    border-color 0.3s;
}

.sv-pill.on {
  color: var(--ink);
  border-color: #fff;
}

.sv-pill:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* The sliding white fill under the active pill. */
.sv-pill-hl {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 999px;
  background: #fff;
  opacity: 0;
  will-change: transform, width;
}

.sv-chapter-text {
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}

.sv-name-wrap {
  position: absolute;
  left: var(--gutter);
  bottom: 9vh;
  visibility: hidden;
  will-change: transform, opacity;
}

.sv-name {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(64px, 7.6vw, 110px);
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.sv-copy {
  position: absolute;
  inset: 0;
  visibility: hidden;
}

.sv-line {
  position: absolute;
  top: 14vh;
  right: var(--gutter);
  max-width: 320px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.5;
}

.sv-scope {
  position: absolute;
  bottom: 9vh;
  right: var(--gutter);
  max-width: 260px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
  text-align: right;
}

.sv-visual {
  position: absolute;
  right: 6vw;
  top: 50%;
  width: 35vw;
  height: 60vh;
  margin-top: -30vh;
  visibility: hidden;
  will-change: transform, opacity;
}

/* Narrow desktop layouts (tablets): long names would reach the scope text — it moves under the line. */
@media (min-width: 768px) and (max-width: 1100px) {
  .sv-scope {
    top: calc(14vh + 76px);
    bottom: auto;
    max-width: 320px;
    text-align: left;
    right: var(--gutter);
  }

  .sv-name {
    font-size: clamp(52px, 7vw, 80px);
  }
}

/* ── Phones ── */
.svm-title {
  margin: 0;
  padding: 18vh var(--gutter) 10vh;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 40px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.svm-pills {
  position: sticky;
  top: 64px;
  z-index: 5;
  display: flex;
  gap: 6px;
  padding: 10px var(--gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.svm-pills .sv-pill {
  flex: none;
  background: rgba(26, 27, 30, 0.5);
  backdrop-filter: blur(6px);
}

.svm-pills .sv-pill.on {
  background: #fff;
}

.svm-card {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
}

.svm-photo {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.svm-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100svh;
  padding: 16vh var(--gutter) 8vh;
}

.svm-body .sv-line,
.svm-body .sv-scope {
  position: static;
  max-width: none;
  text-align: left;
}

.svm-body .sv-name {
  font-size: 52px;
  white-space: normal;
}

.svm-visual {
  flex: 1;
  min-height: 46vh;
}

</style>
