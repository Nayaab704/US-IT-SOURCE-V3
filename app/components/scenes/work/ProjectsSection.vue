<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects, projectsParams, type ProjectScreen } from '~/data/projects'
import { createDayScene, type DayScene } from '~/utils/day/scene'

/**
 * "View our projects" (F1), directly after Step Inside. The wrapper overlaps the last viewport of
 * Step Inside's pin (margin-top: -100svh), so this pin starts exactly where the world has settled into
 * paper. One scrubbed timeline (viewport heights): the sentence emerges from depth (emerge) → becomes
 * the title top-left while the project area rises in (toTitle) → hold while reading (read).
 * Background: the day world's window light on paper (stage scene), faded in after the white-out.
 */
type StreamMode = 'stream' | 'scroller'
type LightboxHandle = { open: (screens: ProjectScreen[], index: number, from: HTMLElement | null) => void }

const props = withDefaults(defineProps<{ refreshPriority?: number }>(), { refreshPriority: 1 })
const root = ref<HTMLElement | null>(null)
const section = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const titleInner = ref<HTMLElement | null>(null)
const words = ref<HTMLElement[]>([])
const reveal: HTMLElement[] = []
const setReveal = (i: number) => (el: unknown) => {
  if (el instanceof HTMLElement) reveal[i] = el
}
const panel = ref<HTMLElement | null>(null)
const tabEls = ref<HTMLElement[]>([])
const lightbox = ref<LightboxHandle | null>(null)

const prefersReduced = useReducedMotion()
const device = useDevice()
// Server renders the full desktop version; phone / reduced-motion variants switch in after mount.
const mounted = ref(false)
const reducedMotion = computed(() => mounted.value && prefersReduced.value)
const isMobile = computed(() => mounted.value && device.isMobile.value)
const streamMode = computed<StreamMode>(() => (reducedMotion.value || isMobile.value ? 'scroller' : 'stream'))

const selected = ref(0)
const project = computed(() => projects[selected.value]!)
/** The project whose text is shown: it swaps once the old text has faded out. */
const textProject = shallowRef(projects[0]!)
const running = ref(false)
const SENTENCE = ['View', 'our', 'projects']

let ctx: gsap.Context | null = null
let pinTrigger: ScrollTrigger | null = null
let day: DayScene | null = null
const light = { amount: 0 }
const applyLight = () => day?.setLightAmount(light.amount)
const velocity = () => pinTrigger?.getVelocity() ?? 0

function buildTimeline() {
  const sec = section.value
  const h2 = title.value
  if (!sec || !h2) return
  pinTrigger = null
  reveal.forEach((el) => (el.style.pointerEvents = ''))
  // Visible while any of the section (and its pin) is on screen: the stream runs only then.
  ScrollTrigger.create({
    trigger: root.value,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (running.value = self.isActive),
  })
  // Rendered at the sentence size and scaled down to the title size: text never upscales.
  const titleScale = () => {
    const title = parseFloat(getComputedStyle(sec).getPropertyValue('--title'))
    const sentence = parseFloat(getComputedStyle(h2).fontSize)
    return title / sentence || 56 / 120
  }
  if (reducedMotion.value) {
    light.amount = 1
    applyLight()
    gsap.set(h2, { x: 0, y: 0, scale: titleScale() })
    return
  }
  const P = projectsParams.pin
  const mobile = isMobile.value
  const E = mobile ? P.emergeMobile : P.emerge
  const T = mobile ? P.toTitleMobile : P.toTitle
  const R = mobile ? P.readMobile : P.read
  // From the title's own slot (scale 1, 120 px) to the viewport centre — measured at the final
  // letter-spacing (the emerge tween may have widened the words already).
  const centre = () => {
    const saved = words.value.map((w) => w.style.letterSpacing)
    words.value.forEach((w) => (w.style.letterSpacing = '0em'))
    const c = {
      x: (window.innerWidth - h2.offsetWidth) / 2 - h2.offsetLeft,
      y: (sec.offsetHeight - h2.offsetHeight) / 2 - h2.offsetTop,
    }
    words.value.forEach((w, i) => (w.style.letterSpacing = saved[i] ?? ''))
    return c
  }
  light.amount = 0
  applyLight()

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * (E + T + R)}`,
      scrub: P.scrub,
      invalidateOnRefresh: true,
      refreshPriority: props.refreshPriority,
    },
  })
  pinTrigger = tl.scrollTrigger ?? null

  // Emerge: tiny and soft in the centre → full size and sharp, word by word (as if from depth).
  tl.fromTo(h2, { x: () => centre().x, y: () => centre().y, scale: 1 }, { x: () => centre().x, y: () => centre().y, scale: 1, duration: E }, 0)
  tl.fromTo(titleInner.value, { scale: 0.35 }, { scale: 1, ease: 'power2.out', duration: E }, 0)
  tl.fromTo(
    words.value,
    { autoAlpha: 0, filter: 'blur(12px)', letterSpacing: '0.08em' },
    { autoAlpha: 1, filter: 'blur(0px)', letterSpacing: '0em', ease: 'power2.out', duration: E * 0.82, stagger: E * 0.05 },
    0,
  )
  // The window light comes back onto the paper after the white-out (flat paper → light, no seam).
  tl.fromTo(light, { amount: 0 }, { amount: 1, duration: E * 0.6, onUpdate: applyLight }, E * 0.1)
  // To the title (top-left), revealing the project area.
  tl.to(h2, { x: 0, y: 0, scale: titleScale, ease: 'power2.inOut', duration: T }, E)
  // Opacity 0.001 (invisible, but unlike 0 Chrome rasterises it), so the stream's soft shadows get
  // their first raster early instead of stalling the reveal. Always focusable: a keyboard user who tabs
  // in before the reveal is taken to the settled section (onFocusIn).
  tl.fromTo(
    reveal,
    { opacity: 0.001, y: 24 },
    {
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      duration: T * 0.5,
      stagger: T * 0.1,
      // Invisible content must not catch the pointer (hover, the "View" cursor) before it is revealed.
      onUpdate() {
        const off = this.progress() < 0.5
        reveal.forEach((el) => (el.style.pointerEvents = off ? 'none' : ''))
      },
    },
    E + T * 0.62,
  )
  tl.to({}, { duration: R }, E + T)
}

function rebuild() {
  ctx?.revert()
  running.value = false
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

// Keyboard: focus arriving before the reveal jumps to the settled section (title formed, content in).
const { goTo } = useMenu()
function onFocusIn() {
  if (reducedMotion.value || !pinTrigger) return
  const settled = pinTrigger.start + (isMobile.value ? projectsParams.pin.emergeMobile + projectsParams.pin.toTitleMobile : projectsParams.pin.emerge + projectsParams.pin.toTitle) * window.innerHeight
  if (window.scrollY >= settled - 4) return
  goTo('projects', true)
  // Skip the scrub's catch-up so the focused element is visible at once.
  requestAnimationFrame(() => pinTrigger?.getTween()?.progress(1))
}

// ── Tabs ──
let busyUntil = 0
function select(i: number) {
  if (i === selected.value) return
  const now = performance.now()
  // A switch takes ~1.1 s; ignore new ones while it runs.
  if (now < busyUntil) return
  busyUntil = reducedMotion.value ? 0 : now + 1100
  selected.value = i
  const el = panel.value
  if (reducedMotion.value || !el) {
    textProject.value = projects[i]!
    return
  }
  // Old text fades up and out, the new one rises in.
  gsap.killTweensOf(el)
  gsap
    .timeline()
    .to(el, { autoAlpha: 0, y: -6, duration: 0.22, ease: 'power1.in' })
    .add(() => {
      textProject.value = projects[i]!
    })
    .fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '+=0.08')
}
function onTabKey(e: KeyboardEvent, i: number) {
  const n = projects.length
  const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
  if (to < 0) return
  e.preventDefault()
  busyUntil = 0
  select(to)
  tabEls.value[to]?.focus()
}

// "View case study →": the rectangle grows from the screens into the case-study page.
const { go } = useRectTransition()
const streamBox = ref<HTMLElement | null>(null)
function openCase(e: MouseEvent) {
  go(textProject.value.href, streamBox.value ?? (e.currentTarget as HTMLElement))
}

function openLightbox(screens: ProjectScreen[], index: number, from: HTMLElement) {
  lightbox.value?.open(screens, index, from)
}

// Dev tuning.
let paneFolder: { dispose(): void } | null = null
async function buildPane() {
  const pane = await useDevPane()
  if (!pane) return
  const f = pane.addFolder({ title: 'projects', expanded: false })
  paneFolder = f
  const S = projectsParams.stream
  f.addBinding(S, 'speed', { label: 'speed (px/s)', min: 0, max: 120, step: 1 })
  f.addBinding(S, 'bottomRow', { label: 'bottom row ×', min: 0.2, max: 1.5, step: 0.05 })
  f.addBinding(S, 'tilt', { label: 'tilt (°)', min: 0, max: 20, step: 0.5 })
  f.addBinding(S, 'perspective', { min: 600, max: 4000, step: 50 })
  f.addBinding(S, 'hoverSlow', { label: 'hover speed ×', min: 0, max: 1, step: 0.05 })
  f.addBinding(S, 'boostMax', { label: 'scroll boost max', min: 0, max: 6, step: 0.1 })
  f.addBinding(S, 'boostEase', { label: 'boost ease (s)', min: 0.1, max: 3, step: 0.05 })
  const P = projectsParams.pin
  for (const k of ['emerge', 'toTitle', 'read'] as const) f.addBinding(P, k, { label: `${k} (vh)`, min: 0.1, max: 4, step: 0.05 }).on('change', rebuild)
}

// The pin must exist before the stage and the world sections create their triggers.
onMounted(() => {
  mounted.value = true
  const start = () => rebuild()
  if (prefersReduced.value || device.isMobile.value) nextTick(start)
  else start()
  void buildPane()
})
useStageScene(
  () => {
    day = createDayScene({ id: 'projects-day', preset: 'problems' })
    applyLight()
    return day
  },
  root,
  { world: 'day', order: -1 },
)
watch([reducedMotion, isMobile], () => nextTick(rebuild))
onBeforeUnmount(() => {
  ctx?.revert()
  paneFolder?.dispose()
})
</script>

<template>
  <div id="projects" ref="root" class="pj-root" :class="{ 'is-overlap': !reducedMotion }" data-world="day">
    <section ref="section" class="pj" aria-labelledby="pj-title">
      <h2 id="pj-title" ref="title" class="pj-title">
        <span ref="titleInner" class="pj-title-inner">
          <template v-for="(w, i) in SENTENCE" :key="w"><span ref="words" class="pj-word">{{ w }}</span><template v-if="i < SENTENCE.length - 1">{{ ' ' }}</template></template>
        </span>
      </h2>

      <div class="pj-content" @focusin="onFocusIn">
        <div class="pj-left">
          <div :ref="setReveal(0)" class="pj-tabs" role="tablist" aria-label="Projects">
            <button
              v-for="(p, i) in projects"
              :id="`pj-tab-${p.slug}`"
              :key="p.slug"
              ref="tabEls"
              type="button"
              role="tab"
              class="pj-tab"
              :aria-selected="i === selected"
              aria-controls="pj-panel"
              :tabindex="i === selected ? 0 : -1"
              @click="select(i)"
              @keydown="onTabKey($event, i)"
            >
              {{ p.name }}
            </button>
          </div>
          <div :ref="setReveal(1)" class="pj-panel-wrap">
            <div id="pj-panel" ref="panel" class="pj-panel" role="tabpanel" :aria-labelledby="`pj-tab-${project.slug}`">
              <h3 class="pj-name">{{ textProject.name }}</h3>
              <p class="pj-desc">{{ textProject.oneLiner }}</p>
              <ul class="pj-chips" aria-label="Scope">
                <li v-for="c in textProject.chips" :key="c" class="pj-chip">{{ c }}</li>
              </ul>
              <a class="pj-link" :href="textProject.href" @click.prevent="openCase($event)">View case study <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
        <div :ref="(el) => { setReveal(2)(el); streamBox = el as HTMLElement | null }" class="pj-right">
          <ScenesWorkProjectStream
            :project="project"
            :mode="streamMode"
            :running="running"
            :velocity="velocity"
            :reduced="reducedMotion"
            @open="openLightbox"
          />
        </div>
      </div>
    </section>
    <ScenesWorkProjectLightbox ref="lightbox" />
  </div>
</template>

<style scoped>
.pj-root {
  position: relative;
  color: var(--ink);
}

/* Overlap Step Inside's last viewport: this pin starts where its pin ends (the world is opaque until then). */
.pj-root.is-overlap {
  margin-top: -100vh;
  margin-top: -100svh;
}

.pj {
  --title-top: 13vh;
  --sentence: 120px;
  --title: 56px;
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

.pj-title {
  position: absolute;
  left: var(--gutter);
  top: var(--title-top);
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  /* Never wider than the screen (768 px tablets run the desktop layout). */
  font-size: min(var(--sentence), 11.5vw);
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  transform-origin: 0 0;
  will-change: transform;
}

.pj-title-inner {
  display: inline-block;
  transform-origin: 50% 50%;
}

.pj-word {
  display: inline-block;
}

.pj-content {
  position: absolute;
  left: var(--gutter);
  right: 0;
  top: calc(var(--title-top) + var(--title) * 1.15 + 3.5vh);
  bottom: 7vh;
  display: grid;
  grid-template-columns: minmax(300px, 34%) 1fr;
  gap: 3vw;
}

.pj-left {
  display: flex;
  flex-direction: column;
  gap: 6vh;
  min-width: 0;
}

.pj-tabs {
  display: flex;
  gap: 8px;
}

.pj-tab {
  flex: none;
  padding: 9px 16px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.3s,
    color 0.3s;
}

.pj-tab[aria-selected='true'] {
  background: var(--ink);
  color: var(--paper);
}

.pj-tab:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
}

.pj-panel {
  max-width: 420px;
}

.pj-name {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 64px;
  line-height: 1;
  letter-spacing: -0.02em;
}

.pj-desc {
  margin: 0 0 22px;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.55;
  color: var(--ink);
}

.pj-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
}

.pj-chip {
  padding: 5px 10px;
  border: 1px solid rgba(22, 24, 29, 0.18);
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--ink-muted);
}

.pj-link {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
}

.pj-link span {
  display: inline-block;
  transition: translate 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.pj-link:hover span {
  translate: 4px 0;
}

.pj-right {
  min-width: 0;
  height: 100%;
}

@media (max-width: 767px) {
  .pj {
    --title-top: 11vh;
    /* Fits 390 px at full size in the centre. */
    --sentence: 48px;
    --title: 40px;
  }

  .pj-content {
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 3vh;
    top: calc(var(--title-top) + var(--title) * 1.15 + 2.5vh);
    bottom: 4vh;
  }

  .pj-left {
    gap: 3vh;
  }

  .pj-tabs {
    overflow-x: auto;
    padding: 2px var(--gutter);
    scrollbar-width: none;
  }

  .pj-panel {
    padding: 0 var(--gutter);
  }

  .pj-name {
    margin-bottom: 10px;
    font-size: 36px;
  }

  .pj-desc {
    margin-bottom: 14px;
    font-size: 15px;
  }

  .pj-chips {
    margin-bottom: 16px;
  }

  .pj-right {
    flex: 1;
    min-height: 0;
    padding-left: var(--gutter);
  }
}
</style>
