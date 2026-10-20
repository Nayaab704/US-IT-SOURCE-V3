<script setup lang="ts">
import gsap from 'gsap'

/**
 * Home hero type (ART_DIRECTION v2 §4.2, Metalab-calm), over the ribbon:
 * headline lower-left · paragraph top-right · service pills left. (The floating pill nav is global:
 * components/ui/PillNav.vue.)
 * Starts hidden; the opening calls play() once its window is full screen (or show() to skip).
 */
const SERVICES = ['Software & Apps', 'AI Modeling', 'Computer Vision & ML', 'Staff Augmentation', 'Technical Training']

const root = ref<HTMLElement | null>(null)
const visible = ref(false)
let ctx: gsap.Context | null = null

/** Headline rises (0.7 s), then paragraph and pills (60 ms stagger) fade up (0.5 s each). */
function play(fast = false) {
  if (!root.value) return
  ctx?.revert()
  visible.value = true
  ctx = gsap.context(() => {
    const q = gsap.utils.selector(root.value)
    if (fast) {
      gsap.fromTo(q('[data-reveal]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' })
      return
    }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(q('.line'), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08 })
      .fromTo(q('.para'), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, 0.45)
      .fromTo(q('.pill'), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 }, 0.55)
  }, root.value)
}

/** Final state, no motion (reduced motion, or the opening switched off). */
function show() {
  ctx?.revert()
  ctx = null
  visible.value = true
}

onBeforeUnmount(() => ctx?.revert())
defineExpose({ play, show })
</script>

<template>
  <div ref="root" class="hero-overlay" :class="{ 'is-visible': visible }">
    <p class="para" data-reveal>
      US IT Source designs and builds custom software, AI and computer vision for businesses that don't fit off-the-shelf
      tools.
    </p>

    <ul class="pills" aria-label="Services">
      <li v-for="s in SERVICES" :key="s" class="pill" data-reveal>{{ s }}</li>
    </ul>

    <h1 class="headline">
      <span class="line-mask"><span class="line" data-reveal>Built around</span></span>
      <span class="line-mask indent"><span class="line" data-reveal>the way you work.</span></span>
    </h1>
  </div>
</template>

<style scoped>
.hero-overlay {
  position: absolute;
  inset: 0;
  color: var(--night-text);
  pointer-events: none;
}

/* Hidden until the opening reveals it (no flash before play()). */
.hero-overlay:not(.is-visible) [data-reveal] {
  visibility: hidden;
  opacity: 0;
}

.pill {
  pointer-events: auto;
}

/* ── Paragraph, top-right ── */
.para {
  position: absolute;
  top: 120px;
  right: var(--gutter);
  max-width: 340px;
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: var(--fs-body);
  line-height: 1.45;
}

/* ── Service pills, left column ── */
.pills {
  position: absolute;
  top: 120px;
  left: var(--gutter);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pill {
  padding: 9px 16px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--night-1) 78%, transparent);
  border: 1px solid color-mix(in oklab, var(--night-text) 10%, transparent);
  backdrop-filter: blur(10px);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 400;
}

/* ── Headline, lower-left: Newsreader 300, 104px at 1440w, second line indented 1.6em ── */
.headline {
  position: absolute;
  left: var(--gutter);
  bottom: calc(var(--gutter) + 40px);
  display: flex;
  flex-direction: column;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(52px, 7.22vw, 104px);
  line-height: 0.96;
  letter-spacing: -0.02em;
}

/* Lines rise from behind their own baseline. */
.line-mask {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.line {
  display: block;
}

.indent {
  padding-left: 1.6em;
}

/* Short desktop windows (e.g. 1280×650 laptops): pills and headline must not meet. */
@media (min-width: 768px) and (max-height: 760px) {
  .pills {
    top: 104px;
    gap: 5px;
  }

  .pill {
    padding: 6px 12px;
    font-size: 13px;
  }

  .headline {
    font-size: min(7.22vw, 13vh);
    bottom: calc(var(--gutter) + 24px);
  }
}

@media (max-width: 767px) {
  .para {
    top: 84px;
    left: var(--gutter);
    right: var(--gutter);
    max-width: none;
  }

  .pills {
    top: auto;
    /* Clear of the headline, which wraps to three lines on a phone (52 px × 0.96 + mask padding). */
    bottom: calc(var(--gutter) + 40px + 3 * 1.04 * 52px + 28px);
    flex-flow: row wrap;
    gap: 6px;
    right: var(--gutter);
  }

  .pill {
    font-size: 13px;
    padding: 7px 12px;
  }
}
</style>
