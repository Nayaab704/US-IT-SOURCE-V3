<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { contactLine, contactParams, ctaEmail, ctaHref, mediaFor, people, rectsDesktop, rectsMobile } from '~/data/contact'
import { createLeavesScene } from '~/utils/leaves/scene'
import { HEADLINE, HEADLINE_TEXT, layoutHandwriting } from './handwriting'

/**
 * "let's work together" + contact (F3). A warm-white page with sunlight through leaves (stage scene,
 * multiplied over the page), scattered photo / video rectangles, and a free-hand ink headline that
 * writes itself as the pinned scene scrolls: rectangles rise first, then the pen writes. Some
 * rectangles sit in front of the ink (each over part of a letter), the others behind it.
 * Below: the contact line, three people with copyable emails, the primary mailto, a mailto form.
 */
const props = withDefaults(defineProps<{ refreshPriority?: number }>(), { refreshPriority: 1 })
const root = ref<HTMLElement | null>(null)
const scene = ref<HTMLElement | null>(null)
const rectEls: HTMLElement[] = []
// The loops play only while the section is on screen (and never with reduced motion: posters stay).
const videos = new Set<HTMLVideoElement>()
const setVideo = (el: unknown) => {
  if (el instanceof HTMLVideoElement) videos.add(el)
}
let videoIO: IntersectionObserver | null = null
const setRect = (i: number) => (el: unknown) => {
  if (el instanceof HTMLElement) rectEls[i] = el
}

const prefersReduced = useReducedMotion()
const device = useDevice()
const mounted = ref(false)
const reducedMotion = computed(() => mounted.value && prefersReduced.value)
const isMobile = computed(() => mounted.value && device.isMobile.value)
const mode = computed(() => (isMobile.value ? 'mobile' : 'desktop'))
const rects = computed(() => (isMobile.value ? rectsMobile : rectsDesktop))
const media = computed(() => mediaFor(rects.value))
const pointer = usePointer()

// The headline box follows the lettering's own proportions.
const aspect = computed(() => {
  const b = layoutHandwriting(HEADLINE[mode.value]).box
  return (b.w + 60) / (b.h + 60)
})

const writing = ref(0)
const state = { t: 0 }
let ctx: gsap.Context | null = null
const C = contactParams
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ease3 = (x: number) => 1 - (1 - x) ** 3
const lengths = () => {
  const k = isMobile.value ? C.pin.mobileScale : 1
  return { R: C.pin.rects * k, W: C.pin.write * k, H: C.pin.hold * k }
}

function render() {
  const { R, W, H } = lengths()
  const t = state.t
  const total = R + W + H
  writing.value = reducedMotion.value ? 1 : clamp01((t - R) / W)
  rectEls.forEach((el, i) => {
    const r = rects.value[i]
    if (!r) return
    if (reducedMotion.value) {
      el.style.opacity = '1'
      el.style.translate = ''
      return
    }
    // Rise in, ~80 ms apart (≈ 0.02 vh of scroll each); then each drifts at its own depth.
    const a = ease3(clamp01((t - i * 0.02) / (R * 0.55)))
    const par = (t / total - 0.5) * -C.parallax * r.depth
    el.style.opacity = a.toFixed(3)
    el.style.translate = `0 ${((1 - a) * 24 + par).toFixed(1)}px`
  })
}

// Cursor drift: ±1° per rectangle, slowly.
const tilt = { x: 0 }
function onTick(_t: number, dms: number) {
  if (reducedMotion.value || isMobile.value || !rectEls.length) return
  const k = 1 - Math.exp((-dms / 1000) * 2)
  tilt.x += ((pointer.inside ? pointer.x : 0) - tilt.x) * k
  rectEls.forEach((el, i) => {
    const r = rects.value[i]
    if (r) el.style.rotate = `${(tilt.x * C.drift * (i % 2 ? -1 : 1) * (0.6 + r.depth * 0.4)).toFixed(3)}deg`
  })
}

function buildTimeline() {
  const sec = scene.value
  if (!sec) return
  // The light (canvas above the page, multiplied) while any of the section is on screen.
  ScrollTrigger.create({
    trigger: root.value,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      document.documentElement.classList.toggle('stage-front', self.isActive)
      document.documentElement.classList.toggle('stage-multiply', self.isActive)
    },
  })
  if (reducedMotion.value) {
    state.t = 0
    render()
    return
  }
  const { R, W, H } = lengths()
  const total = R + W + H
  state.t = 0
  render()
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * total}`,
      scrub: C.pin.scrub,
      invalidateOnRefresh: true,
      refreshPriority: props.refreshPriority,
    },
  })
  tl.to(state, { t: total, duration: total, onUpdate: render }, 0)
}

function rebuild() {
  ctx?.revert()
  document.documentElement.classList.remove('stage-front', 'stage-multiply')
  ctx = gsap.context(buildTimeline)
  ScrollTrigger.refresh()
}

// ── Copy an email ──
const copied = ref<string | null>(null)
const announce = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null
async function copy(email: string) {
  let ok = false
  try {
    await navigator.clipboard.writeText(email)
    ok = true
  } catch {
    // Fallback for browsers / contexts without the async clipboard.
    const ta = document.createElement('textarea')
    ta.value = email
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ok = document.execCommand('copy')
    ta.remove()
  }
  if (!ok) return
  copied.value = email
  announce.value = `${email} copied to the clipboard.`
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = null), 2000)
}

// ── The mailto form (no backend: it opens the visitor's email app) ──
const form = reactive({ name: '', company: '', email: '', message: '' })
function send() {
  const subject = form.company ? `Project enquiry — ${form.company}` : 'Project enquiry'
  const body = [`Name: ${form.name}`, `Company: ${form.company}`, `Email: ${form.email}`, '', form.message].join('\n')
  window.location.href = `mailto:${ctaEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Dev tuning.
let paneFolder: { dispose(): void } | null = null
async function buildPane() {
  const pane = await useDevPane()
  if (!pane) return
  const f = pane.addFolder({ title: 'contact', expanded: false })
  paneFolder = f
  f.addBinding(C, 'pen', { label: 'pen size', min: 2, max: 10, step: 0.1 })
  f.addBinding(C, 'pool', { label: 'ink pool (× pen)', min: 0, max: 0.8, step: 0.01 })
  f.addBinding(C, 'parallax', { label: 'parallax (px)', min: 0, max: 240, step: 1 })
  f.addBinding(C, 'drift', { label: 'cursor drift (°)', min: 0, max: 3, step: 0.05 })
  f.addBinding(C.pin, 'write', { label: 'writing (vh)', min: 0.4, max: 2.5, step: 0.05 }).on('change', rebuild)
  f.addBinding(C.pin, 'rects', { label: 'rects in (vh)', min: 0.1, max: 0.6, step: 0.01 }).on('change', rebuild)
}

onMounted(() => {
  mounted.value = true
  if (prefersReduced.value || device.isMobile.value) nextTick(rebuild)
  else rebuild()
  gsap.ticker.add(onTick)
  void buildPane()
  videoIO = new IntersectionObserver(
    ([e]) => {
      for (const v of videos) {
        if (e?.isIntersecting && !prefersReduced.value) void v.play().catch(() => {})
        else v.pause()
      }
    },
    { rootMargin: '200px 0px' },
  )
  if (root.value) videoIO.observe(root.value)
})
useStageScene(() => createLeavesScene({ id: 'contact-leaves', section: () => root.value }), root, { world: 'day' })
watch([reducedMotion, isMobile], () => nextTick(rebuild))
onBeforeUnmount(() => {
  gsap.ticker.remove(onTick)
  videoIO?.disconnect()
  ctx?.revert()
  document.documentElement.classList.remove('stage-front', 'stage-multiply')
  paneFolder?.dispose()
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div id="contact" ref="root" class="ct-root" data-world="day">
    <section ref="scene" class="ct-scene" aria-labelledby="ct-title">
      <h2 id="ct-title" class="sr-only">{{ HEADLINE_TEXT }}</h2>
      <div class="ct-head" :style="{ '--aspect': String(aspect) }">
        <div
          v-for="(r, i) in rects"
          :key="`${mode}-${i}`"
          :ref="setRect(i)"
          class="ct-rect"
          :class="{ 'is-front': r.front }"
          :style="{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}vw`, aspectRatio: String(r.aspect) }"
          aria-hidden="true"
        >
          <div class="ct-media">
            <img v-if="media[i]?.type === 'image'" :src="(media[i] as { src: string }).src" alt="" loading="lazy" decoding="async" />
            <video
              v-else-if="media[i]?.type === 'video'"
              :ref="setVideo"
              :poster="(media[i] as { poster: string | null }).poster ?? undefined"
              muted
              loop
              playsinline
              preload="none"
            >
              <source v-for="src in (media[i] as { sources: string[] }).sources" :key="src" :src="src" :type="src.endsWith('webm') ? 'video/webm' : 'video/mp4'" />
            </video>
            <span v-else class="ct-ph">[{{ r.kind }}]</span>
          </div>
        </div>
        <ScenesContactHandwriting class="ct-ink" :mode="mode" :progress="writing" />
      </div>
    </section>

    <section class="ct-details" aria-label="Contact">
      <p class="ct-line">{{ contactLine }}</p>
      <ul class="ct-people">
        <li v-for="p in people" :key="p.email" class="ct-person">
          <span class="ct-name">{{ p.name }}</span>
          <span class="ct-role">{{ p.role }}</span>
          <span class="ct-email">
            <a :href="`mailto:${p.email}`">{{ p.email }}</a>
            <button type="button" class="ct-copy" :aria-label="`Copy ${p.email}`" @click="copy(p.email)">
              {{ copied === p.email ? 'Copied' : 'Copy' }}
            </button>
          </span>
        </li>
      </ul>
      <p class="sr-only" aria-live="polite">{{ announce }}</p>
      <a class="ct-cta" :href="ctaHref">Start a conversation</a>

      <form class="ct-form" @submit.prevent="send">
        <p class="ct-form-title">Or write it here</p>
        <div class="ct-fields">
          <label><span>Name</span><input v-model="form.name" name="name" autocomplete="name" required /></label>
          <label><span>Company</span><input v-model="form.company" name="company" autocomplete="organization" /></label>
          <label class="wide"><span>Email</span><input v-model="form.email" type="email" name="email" autocomplete="email" required /></label>
          <label class="wide"><span>Message</span><textarea v-model="form.message" name="message" rows="4" required /></label>
        </div>
        <div class="ct-form-foot">
          <button type="submit" class="ct-send">Send by email</button>
          <span class="ct-note">Opens your email app, addressed to {{ ctaEmail }}.</span>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.ct-root {
  /* Its own stacking context: the light canvas (z 1, multiplied) stays above all of it. */
  position: relative;
  z-index: 0;
  background: #fbf7ef;
  color: #121212;
}

/* Fine grain over the warm white. */
.ct-root::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.05;
  pointer-events: none;
}

.ct-scene {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  /* One composited layer through the pin's fixed → in-flow switch (else its layers rebuild: ~120 ms). */
  will-change: transform;
}

.ct-head {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(78vw, calc(80vh * var(--aspect)));
  aspect-ratio: var(--aspect);
  translate: -50% -48%;
}

.ct-ink {
  position: relative;
  z-index: 2;
}

.ct-rect {
  position: absolute;
  z-index: 1;
  opacity: 0;
  will-change: translate, rotate, opacity;
}

.ct-rect.is-front {
  z-index: 3;
}

/* Soft shadow under each rectangle (a gradient: cheap to rasterise). */
.ct-rect::before {
  content: '';
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: -18px;
  height: 36px;
  z-index: -1;
  background: radial-gradient(50% 50% at 50% 50%, rgba(60, 50, 35, 0.22), rgba(60, 50, 35, 0) 100%);
}

.ct-media {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: #e9e3d8;
}

.ct-media img,
.ct-media video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ct-ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #5e574d;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* ── Contact details ── */
.ct-details {
  position: relative;
  max-width: 1100px;
  margin: 0 auto;
  padding: 12vh var(--gutter) 16vh;
}

.ct-line {
  max-width: 760px;
  margin: 0 0 7vh;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 32px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.ct-people {
  margin: 0 0 6vh;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(18, 18, 18, 0.14);
}

.ct-person {
  display: grid;
  grid-template-columns: 1.1fr 1.4fr 2fr;
  gap: 16px;
  align-items: baseline;
  padding: 18px 0;
  border-bottom: 1px solid rgba(18, 18, 18, 0.14);
  font-family: var(--font-sans);
  font-size: 15px;
}

.ct-name {
  font-weight: 500;
}

.ct-role {
  color: rgba(18, 18, 18, 0.66);
}

.ct-email {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 14px;
}

.ct-email a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(18, 18, 18, 0.3);
  user-select: text;
}

.ct-email a:hover {
  border-bottom-color: currentColor;
}

.ct-copy {
  min-width: 64px;
  padding: 4px 10px;
  border: 1px solid rgba(18, 18, 18, 0.25);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-family: var(--font-sans);
  font-size: 12px;
  cursor: pointer;
}

.ct-copy:hover,
.ct-copy:focus-visible {
  border-color: #121212;
}

.ct-cta {
  display: inline-flex;
  align-items: center;
  padding: 14px 26px;
  border-radius: 999px;
  background: #121212;
  color: #fbf7ef;
  font-family: var(--font-sans);
  font-size: 15px;
  text-decoration: none;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.ct-cta:hover {
  transform: translateY(-2px);
}

.ct-form {
  margin-top: 10vh;
  max-width: 760px;
  font-family: var(--font-sans);
}

.ct-form-title {
  margin: 0 0 18px;
  font-size: 13px;
  color: rgba(18, 18, 18, 0.66);
}

.ct-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 18px;
}

.ct-fields label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: rgba(18, 18, 18, 0.66);
}

.ct-fields label.wide {
  grid-column: 1 / -1;
}

.ct-fields input,
.ct-fields textarea {
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid rgba(18, 18, 18, 0.25);
  background: transparent;
  color: #121212;
  font: inherit;
  font-size: 15px;
  resize: vertical;
}

.ct-fields input:focus,
.ct-fields textarea:focus {
  outline: none;
  border-bottom-color: #121212;
}

.ct-form-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 22px;
}

.ct-send {
  padding: 10px 20px;
  border: 1px solid #121212;
  border-radius: 999px;
  background: transparent;
  color: #121212;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.ct-send:hover,
.ct-send:focus-visible {
  background: #121212;
  color: #fbf7ef;
}

.ct-note {
  font-size: 12px;
  color: rgba(18, 18, 18, 0.55);
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
  .ct-head {
    width: min(84vw, calc(70vh * var(--aspect)));
  }

  .ct-line {
    font-size: 24px;
  }

  .ct-person {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .ct-email {
    justify-content: space-between;
  }

  .ct-fields {
    grid-template-columns: 1fr;
  }
}
</style>
