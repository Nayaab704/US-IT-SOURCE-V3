<script setup lang="ts">
import type { CaseItem } from '~/data/caseStudies'

/**
 * "Actions that update each other" (case studies): each row is "action → resulting status"; while
 * the list is on screen the rows light up in turn — the action, the connector drawing across, the
 * status filling in the accent — like the system reacting. Reduced motion: all rows shown, static.
 */
const props = defineProps<{ items: CaseItem[] }>()
const root = ref<HTMLElement | null>(null)
const reduced = useReducedMotion()
const active = ref(-1)
const rows = computed(() =>
  props.items.map((it) => {
    const [from, to] = it.text.split(/\s*(?:→|->)\s*/)
    return { from: from ?? it.text, to: to ?? '' }
  }),
)

let timer: ReturnType<typeof setInterval> | null = null
let io: IntersectionObserver | null = null
function run(on: boolean) {
  if (timer) clearInterval(timer)
  timer = null
  if (!on || reduced.value) return
  if (active.value < 0) active.value = 0
  timer = setInterval(() => (active.value = (active.value + 1) % rows.value.length), 1600)
}
onMounted(() => {
  io = new IntersectionObserver(([e]) => run(!!e?.isIntersecting), { threshold: 0.4 })
  if (root.value) io.observe(root.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  if (timer) clearInterval(timer)
})
</script>

<template>
  <ol ref="root" class="ac" :class="{ static: reduced }">
    <li v-for="(r, i) in rows" :key="i" class="ac-row" :class="{ on: i === active, past: active >= 0 && i < active }">
      <span class="ac-from">{{ r.from }}</span>
      <span class="ac-link" aria-hidden="true"><span /></span>
      <span v-if="r.to" class="ac-to">{{ r.to }}</span>
      <span v-if="r.to" class="sr-only">updates the status to {{ r.to }}</span>
    </li>
  </ol>
</template>

<style scoped>
.ac {
  --signal: #3b5bff;
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(22, 24, 29, 0.12);
}

.ac-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(22, 24, 29, 0.12);
  font-family: var(--font-sans);
  font-size: 16px;
}

.ac-from {
  color: rgba(22, 24, 29, 0.55);
  transition: color 0.4s;
}

.ac-link {
  position: relative;
  height: 2px;
  background: rgba(22, 24, 29, 0.1);
}

.ac-link span {
  position: absolute;
  inset: 0;
  background: var(--signal);
  transform: scaleX(0);
  transform-origin: 0 50%;
  transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1);
}

.ac-to {
  justify-self: start;
  padding: 6px 14px;
  border: 1px solid rgba(22, 24, 29, 0.2);
  border-radius: 999px;
  color: rgba(22, 24, 29, 0.6);
  font-size: 14px;
  transition:
    background 0.4s 0.45s,
    color 0.4s 0.45s,
    border-color 0.4s 0.45s;
}

.ac-row.on .ac-from,
.ac.static .ac-from {
  color: #16181d;
}

.ac-row.on .ac-link span,
.ac.static .ac-link span {
  transform: scaleX(1);
}

.ac-row.on .ac-to {
  border-color: var(--signal);
  background: var(--signal);
  color: #fff;
}

.ac.static .ac-to {
  border-color: var(--signal);
  color: #16181d;
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
  .ac-row {
    grid-template-columns: 1fr 40px auto;
    gap: 12px;
    font-size: 14px;
  }
}
</style>
