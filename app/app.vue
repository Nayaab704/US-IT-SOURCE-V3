<script setup lang="ts">
// Case studies have no WebGL: a direct visit to /work/* never downloads three.js. Once a page that uses
// the stage has been shown, it stays mounted (one renderer for the session, never torn down and rebuilt).
const route = useRoute()
const stageOn = ref(!route.path.startsWith('/work/'))
watch(
  () => route.path,
  (p) => {
    if (!p.startsWith('/work/')) stageOn.value = true
  },
)
</script>

<template>
  <NuxtRouteAnnouncer />
  <!-- The one site-wide WebGL canvas. Lazy so three.js stays out of the initial bundle. -->
  <LazyStage v-if="stageOn" />
  <NuxtPage />
</template>
