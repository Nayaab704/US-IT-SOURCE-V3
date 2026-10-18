<template>
  <!-- Ink follows the stage world (useWorld → --world), so it crossfades with the atmosphere. -->
  <header class="site-nav">
    <!-- PLACEHOLDER wordmark — replace with the logotype once designed (ART_DIRECTION §4, 1B [TBD]) -->
    <a href="#hero" class="wordmark">US IT SOURCE</a>

    <nav class="links" aria-label="Primary">
      <a href="#work">Work</a>
      <a href="#services">Services</a>
      <!-- PLACEHOLDER target until an About page exists -->
      <a href="#people">About</a>
      <a href="#contact" class="pill">Start a conversation</a>
    </nav>
  </header>
</template>

<style scoped>
.site-nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px var(--gutter);
  color: var(--world-ink);
}

.wordmark {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  font-weight: 500;
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
}

.links {
  display: flex;
  align-items: center;
  gap: 28px;
  font-size: 0.875rem;
}

.pill {
  padding: 8px 16px;
  border: 1px solid currentColor;
  border-radius: 999px;
}
</style>
