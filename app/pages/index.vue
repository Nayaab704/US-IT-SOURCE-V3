<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { menuTarget, type MenuKey } from '~/composables/useMenu'

/**
 * Homepage (ART_DIRECTION §4). In order: opening → hero (ribbon) → rectangle rule into paper → the
 * line & flexible frame → Step Inside (white-out into paper) → View our projects → Five ways we build
 * around you → let's work together + contact → footer. Each section owns its pin and timeline; pins
 * refresh in page order (refreshPriority 5 / 4 / 3 / 2 / 1).
 */

// Paper is the page's ground: it sits under the (z −1) stage canvas, so section backgrounds never
// cover WebGL; the night sections paint their own void.
useHead({ bodyAttrs: { class: 'ground-paper' } })

const title = 'US IT Source — Custom software built around the way you work'
const description = 'US IT Source designs and builds custom software, AI and computer vision around the way each business actually runs.'
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogImage: '/og.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: '/og.jpg',
})

// Registered after every section's pin (this page's onMounted runs after its children's).
useWorldSections()

// Pin lengths depend on layout: refresh (debounced) once fonts, the page and lazy images are in.
let timer: ReturnType<typeof setTimeout> | null = null
const refresh = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => ScrollTrigger.refresh(), 200)
}
const onImage = (e: Event) => {
  if (e.target instanceof HTMLImageElement) refresh()
}
// Arriving from another page with a target (/?to=contact): land on that section, then tidy the URL.
const route = useRoute()
const { goTo } = useMenu()
onMounted(() => {
  const to = route.query.to
  if (typeof to === 'string' && ['projects', 'services', 'contact'].includes(to)) {
    // The target depends on every pin above it: wait until it stops moving (all sections built and
    // refreshed), then jump; give up after ~5 s.
    const key = to as MenuKey
    let last = -1
    let tries = 0
    const poll = setInterval(() => {
      const y = menuTarget(key)
      tries++
      if ((y !== null && Math.abs(y - last) < 1 && tries > 2) || tries > 20) {
        clearInterval(poll)
        goTo(key, true)
        window.history.replaceState(window.history.state, '', '/')
      }
      last = y ?? -1
    }, 250)
  }
  void document.fonts?.ready.then(refresh)
  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })
  document.querySelector('main')?.addEventListener('load', onImage, true)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  window.removeEventListener('load', refresh)
  document.querySelector('main')?.removeEventListener('load', onImage, true)
})
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <UiPillNav />
  <UiSiteMenu />
  <main id="main" class="home" tabindex="-1">
    <ScenesHeroSection :refresh-priority="5" />
    <ScenesFlexframeFlexFrameSection :refresh-priority="4" />
    <ScenesWorkProjectsSection :refresh-priority="3" />
    <ScenesServicesSection :refresh-priority="2" />
    <ScenesContactSection :refresh-priority="1" />
    <ScenesContactSiteFooter />
  </main>
</template>

<style scoped>
.home {
  position: relative;
}

</style>
