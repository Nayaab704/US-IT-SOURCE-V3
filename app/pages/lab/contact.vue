<script setup lang="ts">
/** Lab: "let's work together" + contact + footer (F3). */
useHead({ bodyAttrs: { class: 'ground-paper' } })
useWorldSections()
</script>

<template>
  <main class="ct-page">
    <section class="ct-lead" data-world="night">
      <p>[Services end here — scroll]</p>
    </section>
    <ScenesContactSection />
    <ScenesContactSiteFooter />
  </main>
</template>

<style scoped>
.ct-lead {
  display: grid;
  place-items: center;
  height: 100vh;
  background: #1a1b1e;
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}
</style>
