<script setup lang="ts">
/** Lab: Step Inside (S1 → S3) handing over to "View our projects" (F1). */
useHead({ bodyAttrs: { class: 'ground-paper' } })
useWorldSections()
</script>

<template>
  <main class="pj-page">
    <ScenesFlexframeFlexFrameSection :refresh-priority="2" />
    <ScenesWorkProjectsSection :refresh-priority="1" />
    <section class="pj-after">
      <p>[PLACEHOLDER: Five ways we build around you — F2]</p>
      <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.pj-page {
  color: var(--ink);
}

.pj-after {
  display: grid;
  place-items: center;
  height: 100vh;
  position: relative;
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--ink-muted);
}

.back {
  position: absolute;
  right: var(--gutter);
  bottom: var(--gutter);
  color: var(--ink-muted);
}
</style>
