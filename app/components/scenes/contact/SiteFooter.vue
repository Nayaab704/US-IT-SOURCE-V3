<script setup lang="ts">
/** Site footer (F3): dark, small. Location and LinkedIn are placeholders until supplied. */
import type { MenuKey } from '~/composables/useMenu'

const { scrollTo } = useLenis()
const { goTo } = useMenu()
const route = useRoute()
const links: { label: string; to: string; key: MenuKey }[] = [
  // Real URLs (not #anchors: the smooth-scroll plugin would jump to the section's raw top, mid-transition).
  { label: 'Work', to: '/?to=projects', key: 'projects' },
  { label: 'Services', to: '/?to=services', key: 'services' },
  { label: 'Contact', to: '/?to=contact', key: 'contact' },
]
/** In-page links land where each section is settled (see useMenu), smoothly. */
function go(e: MouseEvent, key: MenuKey) {
  e.preventDefault()
  // On a case-study page: back home, straight to that section.
  if (route.path !== '/') void navigateTo(`/?to=${key}`)
  else goTo(key)
}
</script>

<template>
  <footer class="ft" data-world="night">
    <div class="ft-row">
      <span class="ft-mark">US IT Source</span>
      <nav class="ft-links" aria-label="Footer">
        <a v-for="l in links" :key="l.to" :href="l.to" @click="go($event, l.key)">{{ l.label }}</a>
      </nav>
    </div>
    <div class="ft-row ft-small">
      <!-- Location: added once supplied (docs/PLACEHOLDERS.md). -->
      <a href="#" aria-label="US IT Source on LinkedIn (link to be added)">LinkedIn</a>
      <span>© 2026 US IT Source</span>
      <a href="/" class="ft-top" @click.prevent="scrollTo(0, { duration: 1.6 })">Back to top ↑</a>
    </div>
  </footer>
</template>

<style scoped>
.ft {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 56px var(--gutter) 40px;
  background: var(--void);
  color: rgba(255, 255, 255, 0.86);
  font-family: var(--font-sans);
  font-size: 14px;
}

.ft-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 32px;
}

.ft-mark {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 28px;
  letter-spacing: -0.01em;
  color: #fff;
}

.ft-links {
  display: flex;
  gap: 28px;
}

.ft a {
  color: inherit;
  text-decoration: none;
}

.ft a:hover,
.ft a:focus-visible {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.ft-small {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.ft-top {
  margin-left: auto;
}
</style>
