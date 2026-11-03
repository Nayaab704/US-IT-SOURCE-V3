<script setup lang="ts">
/** Site footer (F3): dark, small. Location and LinkedIn appear once supplied (docs/PLACEHOLDERS.md). */
import type { MenuLinkKey } from '~/composables/useMenu'

/** The company's LinkedIn page — empty until supplied; the link is hidden meanwhile. */
const LINKEDIN_URL = ''

const { scrollTo } = useLenis()
const { goTo } = useMenu()
const route = useRoute()
const links: { label: string; to: string; key: MenuLinkKey }[] = [
  // Real URLs (not #anchors: the smooth-scroll plugin would jump to the section's raw top, mid-transition).
  { label: 'Work', to: '/?to=projects', key: 'projects' },
  { label: 'Services', to: '/?to=services', key: 'services' },
  { label: 'About', to: '/about', key: 'about' },
  { label: 'Contact', to: '/?to=contact', key: 'contact' },
]
const { go: rectGo } = useRectTransition()
/** In-page links land where each section is settled (see useMenu), smoothly; About is its own page. */
function go(e: MouseEvent, key: MenuLinkKey) {
  e.preventDefault()
  if (key === 'about') {
    if (route.path !== '/about') void rectGo('/about', e.currentTarget as Element)
    else scrollTo(0, { duration: 1.6 })
    return
  }
  // On another page: back home, straight to that section.
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
      <a v-if="LINKEDIN_URL" :href="LINKEDIN_URL" rel="noopener" target="_blank">LinkedIn</a>
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
