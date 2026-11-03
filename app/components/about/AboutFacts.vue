<script setup lang="ts">
import { facts } from '~/data/about'

/** /about — company facts (night, quiet): one thin row, placeholders only until supplied. */
</script>

<template>
  <section class="af" data-world="night" aria-label="Company facts">
    <ul class="af-row">
      <li v-for="f in facts" :key="f">{{ f }}</li>
    </ul>
  </section>
</template>

<style scoped>
.af {
  padding: 13vh var(--gutter);
  background: var(--void);
  color: var(--night-text);
}

.af-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
}

.af-row li + li::before {
  content: '·';
  margin: 0 1.6em;
  color: var(--night-muted);
}
</style>
