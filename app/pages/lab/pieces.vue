<script setup lang="ts">
import { createAtmosphereScene, type AtmosphereScene } from '~/utils/atmosphere/scene'
import { createPiecesScene } from '~/utils/pieces/scene'

const hero = ref<HTMLElement | null>(null)
let atmosphere: AtmosphereScene | null = null

useStageScene(() => (atmosphere = createAtmosphereScene({ id: 'pieces-atmosphere', preset: 'hero' })), hero, { order: 0 })
useStageScene(
  () =>
    createPiecesScene({
      id: 'pieces',
      // Pieces are lit by the same key light as the fog (live: tuning the atmosphere moves it).
      keyLight: () => atmosphere?.params.key ?? { x: 0.8, y: 0.9, color: '#ffffff' },
    }),
  hero,
  { order: 1 },
)
</script>

<template>
  <UiSiteNav />
  <main>
    <section id="hero" ref="hero" class="hero" data-scene data-theme="night">
      <!-- ART_DIRECTION 1A: nav + small intro line + SCROLL TO ASSEMBLE. Intro copy is not written yet. -->
      <p class="intro">[PLACEHOLDER: intro line]</p>
      <p class="cue">Scroll to assemble</p>
    </section>
    <section class="after" data-scene data-theme="night">
      <p class="cue">Lab — scroll assembly is not built yet</p>
      <NuxtLink to="/lab" class="cue back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100svh;
}

.intro {
  position: absolute;
  left: var(--gutter);
  bottom: calc(var(--gutter) + 48px);
  max-width: 24em;
  font-size: var(--fs-lead);
  color: var(--night-text);
}

.cue {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

.hero .cue {
  position: absolute;
  left: 50%;
  bottom: var(--gutter);
  transform: translateX(-50%);
}

.after {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100svh;
  padding: 120px var(--gutter);
  background: var(--night-0);
}
</style>
