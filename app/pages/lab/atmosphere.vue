<script setup lang="ts">
import { createAtmosphereScene, type AtmosphereScene } from '~/utils/atmosphere/scene'

const section = ref<HTMLElement | null>(null)
let scene: AtmosphereScene | null = null

useStageScene(
  () => (scene = createAtmosphereScene({ id: 'atmosphere', preset: 'hero' })),
  section,
  // The sticky viewport is pinned for the whole section, so uScroll runs 0 → 1 across it.
  { progress: { start: 'top top', end: 'bottom bottom' } },
)

// Dev hook so tests and the console can reach the live params.
onMounted(() => {
  if (import.meta.dev) (window as Window & { __atmosphere?: () => AtmosphereScene | null }).__atmosphere = () => scene
})
</script>

<template>
  <main>
    <section ref="section" class="scene">
      <div class="sticky">
        <p class="label">Lab — night atmosphere</p>
        <!-- Contrast sample only: the real hero layout is not designed yet. -->
        <h1 class="headline">Technology built around the way your business works.</h1>
        <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Tall section + sticky viewport: scrolling drives uScroll while the frame stays put. */
.scene {
  height: 300svh;
}

.sticky {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100svh;
  padding: var(--gutter);
}

.label,
.back {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

.headline {
  max-width: 13em;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 54px;
  line-height: 1.1;
  color: var(--night-text);
}

.back {
  align-self: flex-start;
}
</style>
