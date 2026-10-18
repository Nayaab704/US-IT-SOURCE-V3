<script setup lang="ts">
import { createAtmosphereScene } from '~/utils/atmosphere/scene'
import { createDayScene, type DayScene } from '~/utils/day/scene'

const page = ref<HTMLElement | null>(null)
const daySection = ref<HTMLElement | null>(null)
let day: DayScene | null = null

// Night ↔ day follows these sections (data-world); the nav and copy ink follow it too.
useWorldSections()

// Night lives behind the whole page; the stage skips it whenever the world is fully day.
useStageScene(() => createAtmosphereScene({ id: 'day-lab-night', preset: 'hero' }), page, { order: 0, world: 'night' })
// Day draws over the night with opacity = world weight; warm-up so it's ready before the crossfade.
useStageScene(() => (day = createDayScene({ id: 'day-lab-day', preset: 'problems' })), daySection, {
  order: 1,
  world: 'day',
  warmup: 0.6,
})

onMounted(() => {
  if (import.meta.dev) (window as Window & { __dayScene?: () => DayScene | null }).__dayScene = () => day
})
</script>

<template>
  <UiSiteNav />
  <main ref="page">
    <section class="night" data-world="night">
      <p class="label">Lab — night (hero atmosphere)</p>
      <p class="label hint">Scroll: the world turns to day</p>
    </section>

    <!-- Transparent: the day atmosphere on the stage is the background. -->
    <section ref="daySection" class="day" data-world="day">
      <div class="copy">
        <p class="label">02 — THE WAY YOU ACTUALLY WORK</p>
        <h2 class="serif">Every business has its own way of working.</h2>
        <p class="body">Most software ignores it. We start by learning it.</p>
      </div>
    </section>

    <section class="night" data-world="night">
      <p class="label">Lab — night again</p>
      <NuxtLink to="/lab" class="label back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.night {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  min-height: 100svh;
  padding: var(--gutter);
}

.day {
  min-height: 160svh;
  padding: 0 var(--gutter);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 11em;
  padding-top: 40svh;
  font-size: clamp(40px, 5.56vw, 80px); /* 80px at 1440 wide — sizes the measure for the serif */
}

.label {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--world-muted);
}

.serif {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: clamp(40px, 5.56vw, 80px);
  line-height: 1.02;
  color: var(--world-ink);
}

.body {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 22px;
  line-height: 1.45;
  color: var(--world-ink);
  max-width: 22em;
}

.back {
  text-decoration: underline;
}
</style>
