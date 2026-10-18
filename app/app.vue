<template>
  <NuxtRouteAnnouncer />
  <!-- The one site-wide WebGL canvas. Lazy so three.js stays out of the initial bundle. -->
  <LazyStage />
  <NuxtPage />
</template>
