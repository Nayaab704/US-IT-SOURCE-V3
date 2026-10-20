<script setup lang="ts">
import { getStroke } from 'perfect-freehand'
import { contactParams } from '~/data/contact'
import { HEADLINE, layoutHandwriting, type HandStroke, type Pt } from './handwriting'

/**
 * Renders the hand-written headline (F3) with perfect-freehand: pressure-varying pen outlines as SVG
 * fills. `progress` (0–1) writes it stroke by stroke in writing order, with short pauses between
 * words and before crossbars; finished strokes are cached, only the live one is rebuilt per update.
 */
const props = defineProps<{ mode: 'desktop' | 'mobile'; progress: number }>()

const PAUSE_UNITS = 140
const layout = computed(() => layoutHandwriting(HEADLINE[props.mode]))
const pad = 30
const viewBox = computed(() => {
  const b = layout.value.box
  return `${(b.x - pad).toFixed(1)} ${(b.y - pad).toFixed(1)} ${(b.w + pad * 2).toFixed(1)} ${(b.h + pad * 2).toFixed(1)}`
})
const aspect = computed(() => (layout.value.box.w + pad * 2) / (layout.value.box.h + pad * 2))

function outline(s: HandStroke, count = s.points.length) {
  const n = Math.max(2, Math.min(count, s.points.length))
  const pts = s.points.slice(0, n).map((p, i) => [p[0], p[1], s.pressure[i]!])
  const size = contactParams.pen
  const done = n >= s.points.length
  const o = getStroke(pts, {
    size,
    thinning: 0.7,
    smoothing: 0.55,
    streamline: 0.3,
    simulatePressure: false,
    start: { taper: size * 2.2, cap: true },
    // The live end is a blunt nib; a finished stroke lifts off with a taper.
    end: done ? { taper: size * 3, cap: true } : { taper: 0, cap: true },
    last: done,
  })
  return toPath(o as Pt[])
}

function toPath(pts: Pt[]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}Q`
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!
    const [x1, y1] = pts[(i + 1) % pts.length]!
    d += `${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} `
  }
  return d + 'Z'
}

// Full outlines, built once per layout.
const full = computed(() => layout.value.strokes.map((s) => outline(s)))
// Writing schedule: each stroke's [start, end] in "ink units" (length + pauses).
const schedule = computed(() => {
  let at = 0
  const items = layout.value.strokes.map((s) => {
    at += s.pauseBefore * PAUSE_UNITS
    const item = { start: at, end: at + s.length }
    at += s.length
    return item
  })
  return { items, total: at }
})

const visible = computed(() => {
  const ink = Math.min(1, Math.max(0, props.progress)) * schedule.value.total
  return layout.value.strokes.map((s, i) => {
    const it = schedule.value.items[i]!
    if (ink <= it.start) return { d: '', started: false }
    if (ink >= it.end) return { d: full.value[i]!, started: true }
    const f = (ink - it.start) / Math.max(1, s.length)
    return { d: outline(s, Math.ceil(f * s.points.length)), started: true }
  })
})

const starts = computed(() => layout.value.strokes.map((s) => s.points[0]!))
defineExpose({ aspect })
</script>

<template>
  <svg class="hw" :viewBox="viewBox" :style="{ aspectRatio: String(aspect) }" aria-hidden="true" focusable="false">
    <g fill="#121212">
      <template v-for="(v, i) in visible" :key="i">
        <!-- A tiny pool of ink where the pen touched down. -->
        <circle v-if="v.started" :cx="starts[i]![0]" :cy="starts[i]![1]" :r="contactParams.pen * contactParams.pool" />
        <path v-if="v.d" :d="v.d" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.hw {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
</style>
