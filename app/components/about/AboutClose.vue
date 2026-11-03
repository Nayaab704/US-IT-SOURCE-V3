<script setup lang="ts">
import { closingLine } from '~/data/about'

/** /about — closing (paper): the line and the pill to the homepage's contact section. */
function toContact() {
  void navigateTo('/?to=contact')
}
</script>

<template>
  <section class="ac" data-world="day">
    <h2 class="ac-line">{{ closingLine }}</h2>
    <a class="ac-pill" href="/?to=contact" @click.prevent="toContact">Start a conversation</a>
  </section>
</template>

<style scoped>
.ac {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5vh;
  padding: 22vh var(--gutter) 24vh;
  color: var(--ink);
}

.ac-line {
  max-width: 12em;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(44px, 6.4vw, 96px);
  line-height: 1.04;
  letter-spacing: -0.015em;
}

.ac-pill {
  display: inline-flex;
  align-items: center;
  padding: 16px 28px;
  font-family: var(--font-sans);
  font-size: 16px;
  color: var(--paper);
  background: var(--ink);
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.ac-pill:hover,
.ac-pill:focus-visible {
  transform: translateY(-2px);
}
</style>
