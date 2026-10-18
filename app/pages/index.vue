<script setup lang="ts">
type Theme = 'night' | 'day'

interface Scene {
  id: string
  index: string
  label: string
  theme: Theme
}

// Order and atmosphere from ART_DIRECTION §4. Only scene 02's label is given verbatim;
// the others are PLACEHOLDERS taken from the §4 scene titles — owner to confirm.
const scenes: Scene[] = [
  { id: 'hero', index: '01', label: 'Built to fit', theme: 'night' },
  { id: 'problems', index: '02', label: 'The way you actually work', theme: 'day' },
  { id: 'approach', index: '03', label: 'How we work', theme: 'day' },
  { id: 'services', index: '04', label: 'Services', theme: 'night' },
  { id: 'work', index: '05', label: 'Selected work', theme: 'night' },
  { id: 'vision', index: '06', label: 'Vision & AI', theme: 'night' },
  { id: 'people', index: '07', label: 'People', theme: 'day' },
  { id: 'contact', index: '08', label: 'Conversation', theme: 'night' },
]
</script>

<template>
  <UiSiteNav />
  <main>
    <section
      v-for="scene in scenes"
      :id="scene.id"
      :key="scene.id"
      class="scene"
      data-scene
      :data-theme="scene.theme"
    >
      <p class="scene-index">{{ scene.index }} — {{ scene.label }}</p>
    </section>
  </main>
</template>

<style scoped>
.scene {
  min-height: 100svh;
  padding: 120px var(--gutter) var(--gutter);
}

.scene[data-theme='night'] {
  background: var(--night-1);
  color: var(--night-muted);
}

.scene[data-theme='day'] {
  background: var(--paper);
  color: var(--ink-muted);
}

.scene-index {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
}
</style>
