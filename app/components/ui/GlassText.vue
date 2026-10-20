<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { glassParams, registerGlassLines, type GlassLine } from '~/composables/useGlassText'

/**
 * Wraps a heading/paragraph. Exiting lines pass "behind glass" near the top of the viewport
 * (scrubbed, line by line); entering lines rise and fade in (timed, no blur). ART_DIRECTION §3.
 *
 * exitMode 'manual': for text inside a pinned section, where nothing moves through the band.
 * The parent drives the exit with `setExit(0–1)` (exposed); lines still dissolve top-first.
 */
const props = withDefaults(defineProps<{ as?: string; exitMode?: 'scroll' | 'manual' }>(), {
  as: 'div',
  exitMode: 'scroll',
})

interface LineState extends GlassLine {
  triggers: ScrollTrigger[]
  tween: gsap.core.Tween | null
}

const root = ref<HTMLElement | null>(null)
const reducedMotion = useReducedMotion()
const { isMobile } = useDevice()
let lines: LineState[] = []
let split: SplitText | null = null
let unregister: (() => void) | null = null

// Single writer per line: enter and exit both feed one style update, so they never fight.
function render(l: LineState) {
  const s = l.el.style
  if (l.exit >= 1) {
    // Fully behind glass: hidden and filter-free (no compositing cost).
    s.visibility = 'hidden'
    s.opacity = '0'
    s.filter = ''
    s.transform = ''
    return
  }
  s.visibility = ''
  s.opacity = String(l.enter * (1 - l.exit))
  if (reducedMotion.value) {
    s.transform = ''
    s.filter = ''
    return
  }
  const p = glassParams
  const y = (1 - l.enter) * p.enterDistance + l.exit * p.offsetY
  const sy = 1 + (p.scaleY - 1) * l.exit
  s.transform = y !== 0 || sy !== 1 ? `translate3d(0, ${y.toFixed(2)}px, 0) scaleY(${sy.toFixed(4)})` : ''
  // Only lines actually inside the band carry a filter.
  const maxBlur = isMobile.value ? p.blurMobile : p.blur
  s.filter = l.exit > 0 ? `blur(${(l.exit * maxBlur).toFixed(2)}px)` : ''
}

function playEnter(l: LineState, delay = 0) {
  l.tween?.kill()
  l.tween = gsap.to(l, {
    enter: 1,
    delay,
    duration: reducedMotion.value ? 0.4 : glassParams.enterDuration,
    ease: reducedMotion.value ? 'none' : 'power3.out',
    onUpdate: () => render(l),
  })
}

function resetEnter(l: LineState) {
  l.tween?.kill()
  l.tween = null
  l.enter = 0
  render(l)
}

function teardownLines() {
  for (const l of lines) {
    l.tween?.kill()
    l.triggers.forEach((t) => t.kill())
  }
  lines = []
}

// Manual mode: the last exit value set by the parent, re-applied after a re-split.
let manualExit = 0
let manualEntered = false

/** Line i dissolves over its own slice of the exit; the top line goes first. */
function applyManualExit() {
  const n = lines.length
  const s = glassParams.manualStagger
  lines.forEach((l, i) => {
    l.exit = Math.min(1, Math.max(0, manualExit * (1 + s * (n - 1)) - i * s))
    render(l)
  })
}

function setExit(progress: number) {
  manualExit = Math.min(1, Math.max(0, progress))
  applyManualExit()
}

defineExpose({ setExit })

function build(self: SplitText) {
  teardownLines()
  const vh = window.innerHeight
  let staggerIndex = 0
  const manual = props.exitMode === 'manual'
  lines = (self.lines as HTMLElement[]).map((el) => {
    el.style.transformOrigin = '50% 100%'
    return { el, enter: 0, exit: 0, color: getComputedStyle(el).color, lightsEdge: !manual, triggers: [], tween: null }
  })

  if (manual) {
    // No scroll triggers: positions inside a pin don't move. Rise in once on first split only.
    lines.forEach((l, i) => {
      if (manualEntered) l.enter = 1
      else playEnter(l, i * glassParams.enterStagger)
    })
    manualEntered = true
    applyManualExit()
    return
  }

  for (const l of lines) {
    const exit = ScrollTrigger.create({
      trigger: l.el,
      start: () => `center ${glassParams.start * 100}%`,
      end: () => `center ${glassParams.end * 100}%`,
      onUpdate: (st) => {
        l.exit = st.progress
        render(l)
      },
      onRefresh: (st) => {
        l.exit = st.progress
        render(l)
      },
    })
    const enter = ScrollTrigger.create({
      trigger: l.el,
      start: () => `top ${glassParams.enterStart * 100}%`,
      onEnter: () => playEnter(l),
      onLeaveBack: () => resetEnter(l),
    })
    l.triggers.push(exit, enter)

    // Initial state: lines already scrolled past are simply shown; lines on screen rise in, staggered.
    const rect = l.el.getBoundingClientRect()
    if (rect.top < vh * glassParams.enterStart) {
      if (rect.bottom < 0) l.enter = 1
      else playEnter(l, staggerIndex++ * glassParams.enterStagger)
    }
    render(l)
  }
}

onMounted(() => {
  if (!root.value) return
  unregister = registerGlassLines(() => lines)
  split = SplitText.create(root.value, {
    type: 'lines',
    linesClass: 'glass-line',
    // No aria-label on the wrapper (prohibited on a plain span/div); the split lines stay readable.
    aria: 'none',
    // Re-splits on width change and once web fonts load (line breaks depend on both).
    autoSplit: true,
    onSplit: (self) => build(self),
  })
})

// Reduced-motion flips live: re-render every line in the other mode.
watch(reducedMotion, () => lines.forEach(render))

onBeforeUnmount(() => {
  teardownLines()
  split?.revert()
  split = null
  unregister?.()
  unregister = null
})
</script>

<template>
  <component :is="props.as" ref="root" class="glass-text">
    <slot />
  </component>
</template>
