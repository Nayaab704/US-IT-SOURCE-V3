<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { CaseItem } from '~/data/caseStudies'

/**
 * A workflow as our line motif (case studies): the blue engineered line with one node per stage,
 * drawn as the section scrolls through (scrubbed, reversible); each stage's sentence appears as the
 * line reaches its node. Horizontal on desktop, vertical on phones. Reduced motion: fully drawn.
 */
const props = defineProps<{ items: CaseItem[] }>()
const root = ref<HTMLElement | null>(null)
const progress = ref(0)
const reduced = useReducedMotion()
let st: ScrollTrigger | null = null

const shown = (i: number) => reduced.value || progress.value >= i / Math.max(1, props.items.length - 1) - 0.02

onMounted(() => {
  st = ScrollTrigger.create({
    trigger: root.value,
    start: 'top 78%',
    end: 'bottom 55%',
    scrub: 0.6,
    onUpdate: (self) => (progress.value = self.progress),
  })
})
onBeforeUnmount(() => st?.kill())
</script>

<template>
  <div ref="root" class="lc" :style="{ '--p': reduced ? 1 : progress, '--n': items.length }">
    <div class="lc-track" aria-hidden="true">
      <span class="lc-line" />
    </div>
    <ol class="lc-stages">
      <li v-for="(it, i) in items" :key="i" class="lc-stage" :class="{ on: shown(i) }">
        <span class="lc-node" aria-hidden="true" />
        <span class="lc-name">{{ it.label ?? it.text }}</span>
        <!-- eslint-disable-next-line vue/no-v-html — escaped by the case-study parser -->
        <p v-if="it.label" class="lc-text" v-html="it.html" />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.lc {
  --signal: #3b5bff;
  position: relative;
  padding-top: 8px;
}

.lc-track {
  position: absolute;
  left: 0;
  right: calc(100% / var(--n));
  top: 15px;
  height: 2px;
  background: rgba(22, 24, 29, 0.1);
}

.lc-line {
  position: absolute;
  inset: 0;
  background: var(--signal);
  transform: scaleX(var(--p));
  transform-origin: 0 50%;
}

.lc-stages {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lc-node {
  display: block;
  width: 16px;
  height: 16px;
  margin-bottom: 22px;
  border: 2px solid rgba(22, 24, 29, 0.2);
  border-radius: 50%;
  background: var(--paper, #f1eee7);
  transition:
    border-color 0.4s,
    background 0.4s,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.lc-stage.on .lc-node {
  border-color: var(--signal);
  background: var(--signal);
  transform: scale(1.1);
}

.lc-name {
  display: block;
  margin-bottom: 10px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.lc-text {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
  color: rgba(22, 24, 29, 0.72);
}

.lc-name,
.lc-text {
  opacity: 0.25;
  transition: opacity 0.5s;
}

.lc-stage.on .lc-name,
.lc-stage.on .lc-text {
  opacity: 1;
}

/* Phones: the line runs down the left, stages beside it. */
@media (max-width: 767px) {
  .lc-track {
    left: 7px;
    right: auto;
    top: 8px;
    bottom: 40px;
    width: 2px;
    height: auto;
  }

  .lc-line {
    transform: scaleY(var(--p));
    transform-origin: 50% 0;
  }

  .lc-stages {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .lc-stage {
    position: relative;
    padding-left: 40px;
  }

  .lc-node {
    position: absolute;
    left: 0;
    top: 6px;
  }
}
</style>
