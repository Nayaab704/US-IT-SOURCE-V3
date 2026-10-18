<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Theme = 'night' | 'day'

const nav = ref<HTMLElement | null>(null)
const theme = ref<Theme>('night')

let ctx: gsap.Context | undefined

onMounted(() => {
  ctx = gsap.context(() => {
    // The nav takes the theme of whichever scene sits under its vertical centre.
    const probe = () => {
      const el = nav.value
      return el ? el.offsetTop + el.offsetHeight / 2 : 0
    }
    document.querySelectorAll<HTMLElement>('[data-scene]').forEach((scene) => {
      ScrollTrigger.create({
        trigger: scene,
        start: () => `top ${probe()}px`,
        end: () => `bottom ${probe()}px`,
        onToggle: (self) => {
          if (self.isActive) theme.value = (scene.dataset.theme as Theme) ?? 'night'
        },
      })
    })
  })
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <header ref="nav" class="site-nav" :data-theme="theme">
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
  --nav-ink: var(--night-text);

  position: fixed;
  inset: 0 0 auto;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px var(--gutter);
  color: var(--nav-ink);
  transition: color 0.4s var(--ease-out);
}

.site-nav[data-theme='day'] {
  --nav-ink: var(--ink);
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
