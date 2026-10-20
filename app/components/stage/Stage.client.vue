<script setup lang="ts">
import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)
const isDev = import.meta.dev
// The stats readout only in dev and only on request (?debug).
const showHud = isDev && new URLSearchParams(window.location.search).has('debug')
const hud = ref('')
let ownsRenderer = false
let hudTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  // .client components render their real template one tick after mount; refs are null until then.
  await nextTick()
  if (!canvas.value) return
  if (hasStageRenderer()) {
    console.error('[stage] <Stage> mounted twice — only one may exist (mount it once in app.vue)')
    return
  }
  const { isMobile, isLowPower } = useDevice()
  const renderer = new WebGLRenderer({
    canvas: canvas.value,
    alpha: true,
    antialias: !isMobile.value && !isLowPower.value,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.setClearColor(0x000000, 0)
  // Several scenes may draw in one frame: clear once ourselves, and count draw calls for the whole frame.
  renderer.autoClear = false
  renderer.info.autoReset = false
  // Shader error checks force synchronous GPU queries on every compile — dev only (three.js advice).
  renderer.debug.checkShaderErrors = isDev
  attachRenderer(renderer)
  ownsRenderer = true

  if (showHud) {
    let lastFrames = 0
    let lastTime = performance.now()
    hudTimer = setInterval(() => {
      const info = getStageInfo()
      const now = performance.now()
      const fps = Math.round(((info.frames - lastFrames) * 1000) / (now - lastTime))
      lastFrames = info.frames
      lastTime = now
      hud.value =
        `${info.running ? `${fps} fps` : 'paused'} · ${info.calls} calls · ${info.triangles} tris\n` +
        `scenes ${info.active}/${info.registered} · geo ${info.geometries} · tex ${info.textures} · prog ${info.programs}\n` +
        `dpr ${info.dpr} · renderers ${info.rendererCreations} · world ${info.world.toFixed(2)}`
    }, 500)
  }
})

onBeforeUnmount(() => {
  clearInterval(hudTimer)
  if (ownsRenderer) detachRenderer()
})
</script>

<template>
  <canvas ref="canvas" class="stage" aria-hidden="true" />
  <pre v-if="showHud" class="stage-hud" aria-hidden="true">{{ hud }}</pre>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.stage-hud {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 1000;
  margin: 0;
  padding: 6px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.5;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  pointer-events: none;
}
</style>
