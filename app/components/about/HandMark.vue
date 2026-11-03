<script setup lang="ts">
import { getStroke } from 'perfect-freehand'

/**
 * A pen mark around a word (/about): a loose underline or a loose circle, drawn by `progress` (0–1)
 * with the same pressure pen as the hand-written contact headline (perfect-freehand). The shapes are
 * fixed, slightly irregular paths in unit space, mapped onto the mark's measured box in pixels (so
 * the pen keeps one width) — hand-made, but the same on every visit.
 */
const props = withDefaults(defineProps<{ kind: 'underline' | 'circle'; progress: number; pen?: number }>(), { pen: 5 })

const el = ref<SVGSVGElement | null>(null)
const size = reactive({ w: 0, h: 0 })
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => {
    if (!e) return
    size.w = e.contentRect.width
    size.h = e.contentRect.height
  })
  if (el.value) ro.observe(el.value)
})
onBeforeUnmount(() => ro?.disconnect())

/** Unit-space points [x 0–1, y 0–1, pressure]. */
type P = [number, number, number]
function underline(): P[] {
  const pts: P[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    // Starts a touch left, drifts up slightly and overshoots right; pressure swells mid-stroke.
    pts.push([-0.02 + t * 1.05, 0.62 - t * 0.22 + Math.sin(t * Math.PI * 1.6) * 0.06, 0.35 + Math.sin(t * Math.PI) * 0.55])
  }
  return pts
}
function circle(): P[] {
  const pts: P[] = []
  const n = 90
  for (let i = 0; i <= n; i++) {
    const t = i / n
    // A little more than one turn, starting top-left; the radius wobbles so it never closes neatly.
    const a = -2.4 + t * Math.PI * 2.25
    const rx = 0.48 + Math.sin(t * 5.1) * 0.025
    const ry = 0.44 + Math.cos(t * 4.3) * 0.04
    pts.push([0.5 + Math.cos(a) * rx, 0.5 + Math.sin(a) * ry + t * 0.05, 0.4 + Math.sin(t * Math.PI) * 0.45])
  }
  return pts
}

const path = computed(() => {
  const { w, h } = size
  const p = Math.min(1, Math.max(0, props.progress))
  if (!w || !h || p <= 0) return ''
  const unit = props.kind === 'underline' ? underline() : circle()
  const n = Math.round(p * (unit.length - 1)) + 1
  if (n < 2) return ''
  const done = n >= unit.length
  const o = getStroke(
    unit.slice(0, n).map(([x, y, pr]) => [x * w, y * h, pr]),
    {
      size: props.pen,
      thinning: 0.6,
      smoothing: 0.6,
      streamline: 0.35,
      simulatePressure: false,
      start: { taper: props.pen * 3, cap: true },
      end: done ? { taper: props.pen * 4, cap: true } : { taper: 0, cap: true },
      last: done,
    },
  )
  if (!o.length) return ''
  let d = `M${o[0]![0].toFixed(1)} ${o[0]![1].toFixed(1)}`
  for (let i = 1; i < o.length; i++) d += `L${o[i]![0].toFixed(1)} ${o[i]![1].toFixed(1)}`
  return `${d}Z`
})
</script>

<template>
  <svg ref="el" class="hm" :class="`is-${kind}`" :viewBox="`0 0 ${size.w || 1} ${size.h || 1}`" aria-hidden="true" focusable="false">
    <path :d="path" />
  </svg>
</template>

<style scoped>
.hm {
  position: absolute;
  overflow: visible;
  pointer-events: none;
  fill: var(--mark, #3b5bff);
}

/* Under the word: its full width, a band just below the baseline. */
.hm.is-underline {
  left: 0;
  width: 100%;
  bottom: -0.34em;
  height: 0.3em;
}

/* Around the word: a loose loop wider and taller than it. */
.hm.is-circle {
  left: -12%;
  width: 124%;
  top: -0.12em;
  height: 1.3em;
}
</style>
