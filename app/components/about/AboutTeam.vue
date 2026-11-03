<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { aboutParams as P, teamStatements } from '~/data/about'

/**
 * /about — "Your team, extended." / "Your team, trained." (paper): two large statements, each with
 * its service line (Staff Augmentation, Technical Training — the services section's own words). A pen
 * underline is drawn under "extended" and a loose circle around "trained" as each scrolls in
 * (scrubbed, reversible). Reduced motion: both marks drawn.
 */
const root = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
const mounted = ref(false)
const reduced = computed(() => mounted.value && prefersReduced.value)
const progress = ref(teamStatements.map(() => 0))

let ctx: gsap.Context | null = null
onMounted(() => {
  mounted.value = true
  ctx = gsap.context(() => {
    root.value?.querySelectorAll<HTMLElement>('.at-item').forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 72%',
        end: () => `+=${window.innerHeight * P.marks.draw}`,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => (progress.value[i] = self.progress),
      })
    })
  }, root.value ?? undefined)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section ref="root" class="at" data-world="day">
    <div v-for="(s, i) in teamStatements" :key="s.word" class="at-item">
      <h2 class="at-statement">
        {{ s.lead }}
        <span class="at-nowrap"><span class="at-word">{{ s.word }}<AboutHandMark :kind="s.mark" :progress="reduced ? 1 : progress[i]!" :pen="P.marks.pen" /></span>.</span>
      </h2>
      <p class="at-line">{{ s.line }}</p>
    </div>
  </section>
</template>

<style scoped>
.at {
  display: flex;
  flex-direction: column;
  gap: 18vh;
  padding: 16vh var(--gutter) 20vh;
  color: var(--ink);
}

.at-item:nth-child(2) {
  align-self: flex-end;
  text-align: right;
}

.at-statement {
  margin: 0 0 3vh;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(48px, 7.4vw, 112px);
  line-height: 1.04;
  letter-spacing: -0.015em;
}

.at-word {
  position: relative;
  display: inline-block;
}

/* The marked word keeps its full stop on the same line. */
.at-nowrap {
  white-space: nowrap;
}

.at-line {
  max-width: 30em;
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--fs-lead);
  line-height: 1.5;
  color: rgba(22, 24, 29, 0.8);
}

.at-item:nth-child(2) .at-line {
  margin-left: auto;
}

@media (max-width: 767px) {
  .at {
    gap: 12vh;
    padding: 10vh var(--gutter) 14vh;
  }

  .at-item:nth-child(2) {
    align-self: auto;
    text-align: left;
  }

  .at-item:nth-child(2) .at-line {
    margin-left: 0;
  }
}
</style>
