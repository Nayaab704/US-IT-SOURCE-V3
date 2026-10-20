<script setup lang="ts">
import { projects } from '~/data/projects'
import { servicesParams, teamPortraits, type Service } from '~/data/services'

/**
 * The side visual of one service chapter (F2): a phone (Garage Automation screens) or desktop
 * (Nester screens) frame crossfading every 1.6 s while its chapter is active, the staff cards fanning
 * out with the chapter's progress, or the training media. Computer Vision draws on the photo itself
 * (ServicesSection), so it renders nothing here.
 */
const props = defineProps<{
  service: Service
  /** Its chapter is the one on screen: only then do timers / video run. */
  active: boolean
  /** 0–1 through the chapter (cards fan out with it). */
  progress: number
  reduced: boolean
}>()

const screens = computed(() => {
  const slug = props.service.visual === 'phone' ? 'garage-automation' : props.service.visual === 'desktop' ? 'nester' : null
  const p = projects.find((x) => x.slug === slug)
  if (!p) return []
  // The phone shows the phone-sized screens when there are any; the desktop the others.
  const want = props.service.visual === 'phone'
  const matching = p.screens.filter((s) => s.mobile === want)
  return matching.length ? matching : p.screens
})
const seq = computed(() => props.service.seq ?? [])
const loop = computed(() => props.service.loop ?? [])
const shown = ref(0)
const video = ref<HTMLVideoElement | null>(null)

let timer: ReturnType<typeof setInterval> | null = null
function sync() {
  if (timer) clearInterval(timer)
  timer = null
  const count = props.service.visual === 'media' ? seq.value.length : screens.value.length
  if (props.active && !props.reduced && count > 1) {
    const every = props.service.visual === 'media' ? servicesParams.crossfade * 2 : servicesParams.crossfade
    timer = setInterval(() => (shown.value = (shown.value + 1) % count), every * 1000)
  }
  const v = video.value
  if (v) {
    if (props.active && !props.reduced) void v.play().catch(() => {})
    else v.pause()
  }
}
watch(() => [props.active, props.reduced, screens.value.length, seq.value.length], sync)
onMounted(sync)
onBeforeUnmount(() => timer && clearInterval(timer))

const F = servicesParams.fan
const cardStyle = (i: number) => {
  const p = props.reduced ? 1 : props.progress
  const k = i - 1
  return { transform: `translate3d(${(k * F.spread * p).toFixed(1)}px, ${(Math.abs(k) * 6 * p).toFixed(1)}px, 0) rotate(${(k * F.angle * p).toFixed(2)}deg)`, zIndex: String(3 - Math.abs(k)) }
}
</script>

<template>
  <div class="sv-vis" :class="`is-${service.visual}`" aria-hidden="true">
    <!-- Phone / desktop: the project's screens, crossfading. -->
    <div v-if="service.visual === 'phone' || service.visual === 'desktop'" class="sv-device">
      <div class="sv-screen">
        <div v-for="(s, i) in screens" :key="i" class="sv-shot" :class="{ on: i === shown }">
          <img v-if="s.src" :src="s.src" alt="" loading="lazy" decoding="async" />
          <span v-else class="sv-ph">[{{ s.label }}]</span>
        </div>
      </div>
    </div>

    <!-- Staff: three portrait cards that fan out. -->
    <div v-else-if="service.visual === 'cards'" class="sv-cards">
      <div v-for="i in 3" :key="i" class="sv-card" :style="cardStyle(i - 1)">
        <img v-if="teamPortraits[i - 1]" :src="teamPortraits[i - 1]" alt="" loading="lazy" decoding="async" />
        <span v-else class="sv-ph">[Team portrait]</span>
      </div>
    </div>

    <!-- Training: a muted loop, else a slow photo sequence, else a labelled frame. -->
    <div v-else-if="service.visual === 'media'" class="sv-media">
      <video v-if="loop.length" ref="video" muted loop playsinline preload="metadata">
        <source v-for="src in loop" :key="src" :src="src" :type="src.endsWith('webm') ? 'video/webm' : 'video/mp4'" />
      </video>
      <template v-else-if="seq.length">
        <div v-for="(src, i) in seq" :key="src" class="sv-shot" :class="{ on: i === shown }">
          <img :src="src" alt="" loading="lazy" decoding="async" />
        </div>
      </template>
      <span v-else class="sv-ph">[Training video or photo sequence]</span>
    </div>
  </div>
</template>

<style scoped>
.sv-vis {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.sv-device {
  position: relative;
}

.is-phone .sv-device {
  height: min(54vh, 560px);
  aspect-ratio: 9 / 19.5;
  padding: 7px;
  border-radius: 40px;
  background: #0d0e10;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 40px 80px -30px rgba(0, 0, 0, 0.7);
}

.is-desktop .sv-device {
  width: min(34vw, 560px);
  aspect-ratio: 16 / 10;
  padding: 6px;
  border-radius: 12px;
  background: #0d0e10;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 40px 80px -30px rgba(0, 0, 0, 0.7);
}

.sv-screen {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 33px;
  background: #e6e3dc;
}

.is-desktop .sv-screen {
  border-radius: 7px;
}

.sv-shot {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.9s ease;
}

.sv-shot.on {
  opacity: 1;
}

.sv-shot img,
.sv-card img,
.sv-media video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 10px;
  background: #e6e3dc;
  color: #55544f;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-align: center;
}

.sv-cards {
  position: relative;
  height: min(46vh, 480px);
  aspect-ratio: 4 / 5;
}

.sv-card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 14px;
  background: #e6e3dc;
  box-shadow: 0 30px 60px -28px rgba(0, 0, 0, 0.65);
  transform-origin: 50% 100%;
  will-change: transform;
}

.sv-media {
  position: relative;
  width: min(34vw, 560px);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 16px;
  background: #e6e3dc;
  box-shadow: 0 40px 80px -30px rgba(0, 0, 0, 0.7);
}

@media (max-width: 767px) {
  .is-phone .sv-device {
    height: 46vh;
  }

  .is-desktop .sv-device,
  .sv-media {
    width: 100%;
  }

  .sv-cards {
    height: 38vh;
  }
}
</style>
