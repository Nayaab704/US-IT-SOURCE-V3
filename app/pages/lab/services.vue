<script setup lang="ts">
/** Lab: "Five ways we build around you" (F2) on its own, between paper lead-in and the F3 placeholder. */
useHead({ bodyAttrs: { class: 'ground-paper' } })
useWorldSections()
</script>

<template>
  <main class="sv-page">
    <section class="sv-lead" data-world="day">
      <p>[Projects end here — scroll]</p>
    </section>
    <ScenesServicesSection />
    <section class="sv-lead" data-world="day">
      <p>[PLACEHOLDER: Let's work together — F3]</p>
      <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.sv-lead {
  position: relative;
  display: grid;
  place-items: center;
  height: 100vh;
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
