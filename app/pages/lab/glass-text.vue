<script setup lang="ts">
import { createAtmosphereScene } from '~/utils/atmosphere/scene'

// The Phase 2 atmosphere behind the night part of the page.
const night = ref<HTMLElement | null>(null)
useStageScene(() => createAtmosphereScene({ id: 'glass-atmosphere', preset: 'hero' }), night)

// Copy is taken verbatim from ART_DIRECTION §4 — test content only, no new copy.
const steps = [
  'Sit with the work — we spend time with the people doing the job and collect what they use today. Every business has its own way of working. Most software ignores it. We start by learning it.',
  'Map the flow — every step, handoff and exception; the client signs off: “yes, this is how we work.” You work A → D → B → F. Your software works A → D → B → F.',
  'Build to the map — apps, trackers and dashboards follow the map exactly: your words, your fields, your order of steps. Engineers who join your team, use your tools and follow your process.',
  'Run it, then grow it — roll out, train, adjust as the business changes. Hands-on training that leaves your people confident with the systems they run every day.',
]
</script>

<template>
  <main>
    <div ref="night" class="night">
      <section class="block block--first">
        <UiGlassText as="h1" class="headline">Technology built around the way your business works.</UiGlassText>
      </section>

      <section class="block">
        <UiGlassText as="p" class="lead">
          Every business has its own way of working. Most software ignores it. We start by learning it.
          We spend time with the people doing the job and collect what they use today.
        </UiGlassText>
      </section>

      <section class="block">
        <UiGlassText as="p" class="mono">02 — The way you actually work</UiGlassText>
      </section>

      <!-- Performance block: 4 long paragraphs crossing the band together. -->
      <section class="block block--stack">
        <UiGlassText v-for="(s, i) in steps" :key="i" as="p" class="body">{{ s }}</UiGlassText>
      </section>
    </div>

    <section class="day">
      <UiGlassText as="h2" class="serif">Every business has its own way of working.</UiGlassText>
      <UiGlassText as="p" class="body body--day">
        Most software ignores it. We start by learning it. Apps, trackers and dashboards follow the map exactly:
        your words, your fields, your order of steps.
      </UiGlassText>
    </section>

    <section class="tail">
      <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.night {
  color: var(--night-text);
}

.block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 90svh;
  padding: 0 var(--gutter);
}

.block--first {
  min-height: 100svh;
}

.block--stack {
  gap: 1.6em;
  padding-block: 30svh;
}

.headline {
  max-width: 13em;
  font-weight: 300;
  font-size: 54px;
  line-height: 1.1;
}

.lead {
  max-width: 30em;
  font-size: var(--fs-lead);
  line-height: 1.5;
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

.body {
  max-width: 34em;
  font-size: var(--fs-body);
  line-height: 1.6;
}

.day {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  min-height: 150svh;
  padding: 30svh var(--gutter);
  background: var(--paper);
  color: var(--ink);
}

.serif {
  max-width: 14em;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: var(--fs-h1);
  line-height: 1.05;
}

.body--day {
  color: var(--ink);
}

.tail {
  min-height: 100svh;
  padding: var(--gutter);
  background: var(--paper);
}

.back {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--ink-muted);
}
</style>
