<script setup lang="ts">
/** Lab: the flexible-frame section (S1 → S3 "Step Inside"). */
useWorldSections()
</script>

<template>
  <main class="ff-page">
    <ScenesFlexframeFlexFrameSection />
    <section class="ff-after">
      <p>[PLACEHOLDER: next section]</p>
      <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.ff-page {
  background: var(--paper);
  color: var(--ink);
}

.ff-after {
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
