<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { steps } from '~/data/about'

/**
 * /about — "How we work" (paper): a sticky title on the left with our blue engineered line and one
 * node per step; the four steps scroll past on the right. As a step reaches the middle of the screen
 * it becomes active and the line grows to its node. Reduced motion: line drawn, every step active.
 * Phones: one column, the line down the left of the steps.
 */
const root = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
const mounted = ref(false)
const reduced = computed(() => mounted.value && prefersReduced.value)
const active = ref(0)
const reached = computed(() => (reduced.value ? steps.length - 1 : active.value))

let ctx: gsap.Context | null = null
onMounted(() => {
  mounted.value = true
  ctx = gsap.context(() => {
    root.value?.querySelectorAll<HTMLElement>('.as-step').forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) active.value = i
        },
        // Scrolling back above the first step: back to the start.
        onLeaveBack: () => {
          if (i === 0) active.value = 0
        },
      })
    })
  }, root.value ?? undefined)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section ref="root" class="as" data-world="day" aria-labelledby="as-title" :style="{ '--n': steps.length, '--reached': reached }">
    <div class="as-side">
      <div class="as-sticky">
        <h2 id="as-title" class="as-title">How we work</h2>
        <div class="as-track" aria-hidden="true">
          <span class="as-line" />
          <span v-for="(s, i) in steps" :key="s.name" class="as-node" :class="{ on: i <= reached }" :style="{ '--i': i }" />
        </div>
      </div>
    </div>
    <ol class="as-steps">
      <li v-for="(s, i) in steps" :key="s.name" class="as-step" :class="{ on: i <= reached, current: i === reached }">
        <h3 class="as-name">{{ s.name }}</h3>
        <p class="as-text">{{ s.text }}</p>
        <figure v-if="s.photo" class="as-photo">
          <picture>
            <source v-if="s.photo.avif" :srcset="s.photo.avif" type="image/avif" sizes="(max-width: 767px) 88vw, 44vw" />
            <img :src="s.photo.src" :srcset="s.photo.srcset" sizes="(max-width: 767px) 88vw, 44vw" alt="" :width="s.photo.width" :height="s.photo.height" loading="lazy" decoding="async" />
          </picture>
        </figure>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.as {
  --line: #3b5bff;
  --track-h: 46vh;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 6vw;
  padding: 22vh var(--gutter) 18vh;
  color: var(--ink);
}

.as-sticky {
  position: sticky;
  top: 22vh;
}

.as-title {
  margin: 0 0 7vh;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(40px, 5vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.015em;
}

/* The engineered line: a hairline track, the blue line grown to the reached node. */
.as-track {
  position: relative;
  width: 16px;
  height: var(--track-h);
  margin-left: 2px;
}

.as-track::before,
.as-line {
  content: '';
  position: absolute;
  left: 7px;
  top: 8px;
  width: 2px;
  height: calc(100% - 16px);
  background: rgba(22, 24, 29, 0.12);
}

.as-line {
  background: var(--line);
  transform: scaleY(calc(var(--reached) / (var(--n) - 1)));
  transform-origin: 50% 0;
  transition: transform 1.1s cubic-bezier(0.65, 0, 0.35, 1);
}

.as-node {
  position: absolute;
  left: 0;
  top: calc((100% - 16px) * var(--i) / (var(--n) - 1));
  width: 16px;
  height: 16px;
  border: 2px solid rgba(22, 24, 29, 0.24);
  border-radius: 50%;
  background: var(--paper);
  transition:
    border-color 0.5s 0.5s,
    background 0.5s 0.5s;
}

.as-node.on {
  border-color: var(--line);
  background: var(--line);
}

.as-steps {
  margin: 0;
  padding: 0;
  list-style: none;
}

.as-step {
  padding: 0 0 18vh;
}

/* Steps not reached yet: the photo and the (large) name recede; the sentence stays fully legible. */
.as-name,
.as-photo {
  transition:
    color 0.8s,
    opacity 0.8s;
}

.as-step:not(.on) .as-name {
  color: rgba(22, 24, 29, 0.55);
}

.as-step:not(.on) .as-photo {
  opacity: 0.45;
}

.as-step:last-child {
  padding-bottom: 6vh;
}

.as-name {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(30px, 3vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.as-text {
  max-width: 34em;
  margin: 0 0 4vh;
  font-family: var(--font-sans);
  font-size: var(--fs-lead);
  line-height: 1.5;
  color: rgba(22, 24, 29, 0.8);
}

.as-photo {
  margin: 0;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(22, 24, 29, 0.06);
}

.as-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 767px) {
  .as {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 14vh var(--gutter) 10vh 52px;
  }

  .as-sticky {
    position: static;
  }

  .as-title {
    margin-bottom: 6vh;
  }

  /* The line runs down the left of the steps, from the first step to the last. */
  .as-track {
    position: absolute;
    left: 14px;
    top: calc(14vh + 120px);
    bottom: 10vh;
    height: auto;
    margin: 0;
  }

  .as-step {
    padding-bottom: 10vh;
  }
}
</style>
