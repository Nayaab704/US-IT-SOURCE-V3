<script lang="ts">
/** Pipeline test only — not design. Neutral grey/blue. */
export const testSceneParams = {
  speed: 0.15,
  pointerInfluence: 0.25,
}
</script>

<script setup lang="ts">
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2 } from 'three'
import type { StageScene } from '~/composables/useStage'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerInfluence;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv + uPointer * uPointerInfluence;
    float g = 0.5 + 0.5 * sin(p.x * 2.4 + uTime) * cos(p.y * 1.7 - uTime * 0.7);
    vec3 grey = vec3(0.22, 0.23, 0.25);
    vec3 blue = vec3(0.09, 0.13, 0.22);
    vec3 col = mix(grey, blue, g) * (0.6 + 0.4 * vUv.y);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function createTestScene(): StageScene {
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new Vector2() },
      uPointerInfluence: { value: testSceneParams.pointerInfluence },
    },
    depthTest: false,
    depthWrite: false,
  })
  scene.add(new Mesh(geometry, material))
  let elapsed = 0

  return {
    id: 'lab-stage-test',
    init(ctx) {
      ctx.pane?.addBinding(testSceneParams, 'speed', { min: 0, max: 2, step: 0.01 })
      ctx.pane?.addBinding(testSceneParams, 'pointerInfluence', { min: 0, max: 1, step: 0.01 })
    },
    update(_time, delta, _scrollProgress, pointer) {
      elapsed += delta * testSceneParams.speed
      const u = material.uniforms
      u.uTime!.value = elapsed
      u.uPointerInfluence!.value = testSceneParams.pointerInfluence
      ;(u.uPointer!.value as Vector2).set(pointer.smoothX, pointer.smoothY)
    },
    render(renderer) {
      renderer.render(scene, camera)
    },
    resize() {},
    setActive() {},
    dispose() {
      geometry.dispose()
      material.dispose()
      scene.clear()
    },
  }
}

const section = ref<HTMLElement | null>(null)
useStageScene(createTestScene, section)
</script>

<template>
  <main>
    <section ref="section" class="test">
      <p class="label">Lab — stage pipeline test</p>
      <NuxtLink to="/lab" class="back">← /lab</NuxtLink>
    </section>
    <section class="spacer">
      <p class="label">Plain DOM section. Scroll until the test section is gone: the HUD should read “paused”.</p>
    </section>
  </main>
</template>

<style scoped>
.test {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100svh;
  padding: var(--gutter);
}

.spacer {
  min-height: 160svh;
  padding: var(--gutter);
  background: var(--night-0);
}

.label {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--night-muted);
}

.back {
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  text-decoration: underline;
}
</style>
