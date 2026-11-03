<script setup lang="ts">
import { gsap } from 'gsap'
import type { DayScene } from '~/utils/day/scene'
import { aboutParams as P, heroParts, heroPhotos, heroText } from '~/data/about'

/**
 * /about hero (paper, window light): one large editorial sentence with three small real photos set
 * inside the line. On load the words rise in one by one and each photo opens from a thin vertical
 * line into its rectangle (the rectangle rule); then each photo slowly crossfades between its images.
 * Reduced motion: everything in place, first photo of each slot, no crossfade.
 */
const root = ref<HTMLElement | null>(null)
const prefersReduced = useReducedMotion()
const mounted = ref(false)
const reduced = computed(() => mounted.value && prefersReduced.value)

// Words, with a photo slot after each of the first three parts.
const pieces = heroParts.flatMap((part, i) => [
  ...part.split(' ').map((w) => ({ kind: 'word' as const, text: w })),
  ...(i < 3 ? [{ kind: 'photo' as const, slot: i }] : []),
])
const shown = ref([0, 0, 0])

let ctx: gsap.Context | null = null
const timers: ReturnType<typeof setInterval>[] = []
const delays: ReturnType<typeof setTimeout>[] = []

function startCrossfades() {
  heroPhotos.forEach((imgs, slot) => {
    if (imgs.length < 2) return
    // Staggered so the three never change together.
    delays.push(
      setTimeout(
        () => timers.push(setInterval(() => (shown.value[slot] = (shown.value[slot]! + 1) % imgs.length), P.hero.hold * 1000)),
        slot * ((P.hero.hold * 1000) / 3),
      ),
    )
  })
}

onMounted(() => {
  mounted.value = true
  const el = root.value
  if (!el) return
  if (prefersReduced.value) {
    el.classList.add('is-live')
    return
  }
  ctx = gsap.context(() => {
    const words = el.querySelectorAll<HTMLElement>('.ah-w')
    const photos = el.querySelectorAll<HTMLElement>('.ah-ph')
    gsap.set(words, { autoAlpha: 0, y: '0.6em' })
    gsap.set(photos, { clipPath: 'inset(0% calc(50% - 1px) round 4px)', autoAlpha: 0 })
    el.classList.add('is-live')
    const tl = gsap.timeline({ delay: 0.25, onComplete: startCrossfades })
    tl.to(words, { autoAlpha: 1, y: 0, duration: P.hero.rise, ease: 'power3.out', stagger: P.hero.stagger }, 0)
    // Each photo opens as the word before it lands.
    photos.forEach((ph) => {
      const before = Number(ph.dataset.after ?? 0)
      tl.to(ph, { autoAlpha: 1, duration: 0.01 }, before * P.hero.stagger + P.hero.rise * 0.5)
      tl.to(ph, { clipPath: 'inset(0% 0% round 4px)', duration: P.hero.open, ease: 'power3.inOut' }, before * P.hero.stagger + P.hero.rise * 0.5)
    })
  }, el)
})

// The window light on the paper (the homepage's day world): drawn behind the sentence.
let day: DayScene | null = null
useStageScene(
  () =>
    import('~/utils/day/scene').then(({ createDayScene }) => {
      day = createDayScene({ id: 'about-day', preset: 'problems' })
      day.setLightAmount(1)
      return day
    }),
  root,
  { world: 'day', order: -1, eager: true },
)

onBeforeUnmount(() => {
  ctx?.revert()
  timers.forEach(clearInterval)
  delays.forEach(clearTimeout)
})

// Index of the word each photo follows (for its entrance timing).
let wordCount = 0
const wordIndexBefore = pieces.map((p) => (p.kind === 'word' ? wordCount++ : wordCount - 1))
</script>

<template>
  <section ref="root" class="ah" data-world="day" aria-labelledby="about-title">
    <p class="ah-kicker">About</p>
    <h1 id="about-title" class="ah-title" :aria-label="heroText">
      <template v-for="(p, i) in pieces" :key="i">
        <span v-if="p.kind === 'word'" class="ah-w" aria-hidden="true">{{ p.text }}</span>
        <span v-else class="ah-ph" :data-after="wordIndexBefore[i]" aria-hidden="true">
          <picture v-for="(img, k) in heroPhotos[p.slot]" :key="img.src" class="ah-img" :class="{ on: k === (reduced ? 0 : shown[p.slot]) }">
            <source v-if="img.avif" :srcset="img.avif" type="image/avif" sizes="160px" />
            <img :src="img.src" :srcset="img.srcset" sizes="160px" alt="" decoding="async" :fetchpriority="k === 0 ? 'high' : 'low'" />
          </picture>
        </span>
        {{ ' ' }}
      </template>
    </h1>
  </section>
</template>

<style scoped>
.ah {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18vh var(--gutter) 14vh;
  color: var(--ink);
}

.ah-kicker {
  margin: 0 0 4vh;
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: rgba(22, 24, 29, 0.66);
}

.ah-title {
  max-width: 15.5em;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(44px, 7.6vw, 110px);
  line-height: 1.08;
  letter-spacing: -0.015em;
}

.ah-w {
  display: inline-block;
}

/* A small photo at cap height inside the line. */
.ah-ph {
  position: relative;
  display: inline-block;
  width: 1.04em;
  height: 0.72em;
  margin: 0 0.04em;
  vertical-align: -0.02em;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(22, 24, 29, 0.08);
}

.ah-img {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s ease;
}

.ah-img.on {
  opacity: 1;
}

.ah-img img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Before the script runs (and if it never does): the sentence is simply there. While it animates,
   gsap owns the words' visibility. */
@media (prefers-reduced-motion: no-preference) {
  .ah:not(.is-live) .ah-w,
  .ah:not(.is-live) .ah-ph {
    animation: ah-fallback 0s 2.5s both;
  }
}

@keyframes ah-fallback {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 767px) {
  .ah {
    min-height: 88svh;
    padding: 16vh var(--gutter) 10vh;
  }
}
</style>
