<script setup lang="ts">
/**
 * The floating pill nav (ART_DIRECTION v2 §4.2): Menu · US IT SOURCE · local time, fixed at the top
 * centre for the whole page. Its colours follow the world behind it (useWorld → --world: 0 night,
 * 1 day), so it reads on the ribbon and on paper alike.
 */
const { time, zone } = useLocalTime()
const { open } = useMenu()
</script>

<template>
  <nav class="pill-nav" aria-label="Primary">
    <button type="button" class="item menu" aria-controls="site-menu" :aria-expanded="open" @click="open = !open">Menu</button>
    <span class="item brand">US IT SOURCE</span>
    <span class="item time">{{ time }} <span class="zone">{{ zone }}</span></span>
  </nav>
</template>

<style scoped>
.pill-nav {
  --w: var(--world, 0);
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 800; /* above the page and the stage canvas; under the opening's white layer (900) */
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  translate: -50% 0;
  border-radius: 999px;
  background: color-mix(in oklab, color-mix(in oklab, var(--night-1), var(--paper-raised) calc(var(--w) * 100%)) 84%, transparent);
  border: 1px solid color-mix(in oklab, var(--world-ink) 12%, transparent);
  backdrop-filter: blur(12px);
  color: var(--world-ink);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.item {
  padding: 8px 14px;
  border-radius: 999px;
  white-space: nowrap;
}

.menu:focus-visible {
  outline: 2px solid var(--world-ink);
  outline-offset: 2px;
}

.menu {
  border: 0;
  background: color-mix(in oklab, var(--world-ink) 9%, transparent);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.brand {
  letter-spacing: 0.08em;
}

.time,
.zone {
  color: var(--world-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 767px) {
  .pill-nav {
    top: 16px;
    font-size: 12px;
  }
}
</style>
