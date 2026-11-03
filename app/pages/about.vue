<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { FolderApi } from 'tweakpane'
import { aboutParams } from '~/data/about'

/**
 * /about. In order: the editorial sentence with photos in the line (paper, window light) → the giant
 * moving line (night) → how we work (paper) → your team, extended & trained → leadership → company
 * facts (night) → closing → footer. Copy and photos: app/data/about.ts.
 */
const title = 'About — US IT Source'
// From the owner's hero sentence (confirm: docs/PLACEHOLDERS.md).
const description = 'We sit with your team, learn how you work, and build software around it — custom apps, AI and computer vision from US IT Source.'
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogImage: '/og.jpg',
  twitterCard: 'summary_large_image',
})
useHead({ bodyAttrs: { class: 'ground-paper' } })
useWorldSections()

// The pinned line depends on layout: refresh (debounced) once fonts, the page and lazy images are in.
let timer: ReturnType<typeof setTimeout> | null = null
const refresh = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => ScrollTrigger.refresh(), 200)
}
// Dev (?debug): the page's look & motion params.
let paneFolder: FolderApi | null = null
onMounted(() => {
  if (import.meta.dev) {
    void useDevPane().then((pane) => {
      if (!pane) return
      const f = (paneFolder = pane.addFolder({ title: 'about', expanded: false }))
      const P = aboutParams
      f.addBinding(P.hero, 'stagger', { label: 'word stagger (s)', min: 0, max: 0.3, step: 0.005 })
      f.addBinding(P.hero, 'rise', { label: 'word rise (s)', min: 0.2, max: 2, step: 0.05 })
      f.addBinding(P.hero, 'open', { label: 'photo open (s)', min: 0.2, max: 2, step: 0.05 })
      f.addBinding(P.hero, 'hold', { label: 'photo hold (s)', min: 2, max: 15, step: 0.5 })
      f.addBinding(P.line, 'pin', { label: 'line pin (vh)', min: 0.4, max: 3, step: 0.05 }).on('change', refresh)
      f.addBinding(P.line, 'scrub', { min: 0, max: 3, step: 0.05 })
      f.addBinding(P.marks, 'draw', { label: 'mark draw (vh)', min: 0.1, max: 1.5, step: 0.05 }).on('change', refresh)
      f.addBinding(P.marks, 'pen', { label: 'mark pen (px)', min: 1, max: 12, step: 0.5 })
    })
  }
  void document.fonts?.ready.then(refresh)
  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })
})
onBeforeUnmount(() => {
  paneFolder?.dispose()
  if (timer) clearTimeout(timer)
  window.removeEventListener('load', refresh)
})
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <UiPillNav />
  <UiSiteMenu />
  <main id="main" class="about">
    <AboutHero />
    <AboutLine :refresh-priority="2" />
    <AboutSteps />
    <AboutTeam />
    <AboutLeaders />
    <AboutFacts />
    <AboutClose />
  </main>
  <ScenesContactSiteFooter />
</template>

<style scoped>
.about {
  position: relative;
}
</style>
