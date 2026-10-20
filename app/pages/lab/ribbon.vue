<script setup lang="ts">
import gsap from 'gsap'
import type { OpeningMode, OpeningWorld, RevealKind } from '~/components/ui/Opening.client.vue'
import { createRibbonScene, type RibbonScene } from '~/utils/ribbon/scene'

const page = ref<HTMLElement | null>(null)
const hero = ref<{ play: (fast?: boolean) => void; show: () => void } | null>(null)
let scene: RibbonScene | null = null
useStageScene(
  () => {
    scene = createRibbonScene({ id: 'ribbon' })
    return scene
  },
  page,
  { world: 'night' },
)

// The opening holds at its portrait card until the ribbon has really rendered.
const ready = ref(false)
function pollReady() {
  if (scene?.isReady()) {
    ready.value = true
    gsap.ticker.remove(pollReady)
  }
}
onMounted(() => gsap.ticker.add(pollReady))
onBeforeUnmount(() => gsap.ticker.remove(pollReady))

const world: OpeningWorld = {
  setInflate: (v) => scene?.setInflate(v),
  setDolly: (s) => scene?.setDolly(s),
}

// Dev review: ?opening=first|repeat|off forces a variant (default: first visit, then repeat per session).
const route = useRoute()
const mode = computed<OpeningMode>(() => {
  const q = route.query.opening
  return q === 'first' || q === 'repeat' || q === 'off' ? q : 'auto'
})

function onReveal(kind: RevealKind) {
  if (kind === 'static') hero.value?.show()
  else hero.value?.play(kind === 'fast')
}
</script>

<template>
  <main ref="page" class="ribbon-lab">
    <UiPillNav />
    <ScenesHeroOverlay ref="hero" />
    <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    <ClientOnly>
      <UiOpening :ready="ready" :world="world" :mode="mode" @reveal="onReveal" />
      <!-- Server render / before hydration: the same white page, so the first paint is never the hero. -->
      <template #fallback>
        <div class="opening-cover" aria-hidden="true" />
      </template>
    </ClientOnly>
  </main>
</template>

<style scoped>
.ribbon-lab {
  position: relative;
  height: 100svh;
}

.opening-cover {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: var(--paper-raised);
}

.back {
  position: absolute;
  right: var(--gutter);
  bottom: var(--gutter);
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}
</style>
