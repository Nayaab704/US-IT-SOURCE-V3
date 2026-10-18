<script setup lang="ts">
// Dev-only: this folder is excluded from production builds (nuxt.config.ts → $production.ignore).
const router = useRouter()
const experiments = computed(() =>
  router
    .getRoutes()
    .filter((r) => r.path.startsWith('/lab/') && r.path !== '/lab/')
    .map((r) => r.path)
    .sort(),
)
</script>

<template>
  <main class="lab">
    <p class="label">Lab — dev only</p>
    <ul v-if="experiments.length">
      <li v-for="path in experiments" :key="path">
        <NuxtLink :to="path">{{ path }}</NuxtLink>
      </li>
    </ul>
    <p v-else>No experiments yet.</p>
  </main>
</template>

<style scoped>
.lab {
  display: grid;
  gap: 24px;
  padding: var(--gutter);
}

.label {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

a {
  text-decoration: underline;
}
</style>
