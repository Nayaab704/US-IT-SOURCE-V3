import { Color, LinearFilter, LinearSRGBColorSpace, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector4, WebGLRenderTarget, type IUniform } from 'three'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { loadShader } from '~/utils/shaders'
import { leavesParams as P } from './params'

/**
 * Sunlight through leaves (F3). The pattern renders at reduced resolution (it is all soft), then a
 * composite upsamples it with fine grain, only inside the section's rect (white = neutral elsewhere).
 * The page lifts the canvas above itself with mix-blend-mode: multiply while the section is on screen
 * (html.stage-front.stage-multiply), so the light falls on the paper, the photos and the ink alike.
 */
export interface LeavesScene extends StageScene {
  readonly params: typeof P
}

export function createLeavesScene(options: { id?: string; section: () => HTMLElement | null }): LeavesScene {
  const reducedMotion = useReducedMotion()
  const u = <T>(value: T): IUniform<T> => ({ value })
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  let compileStage = 0
  const geometry = new PlaneGeometry(2, 2)
  const target = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false })
  const lightUniforms = {
    uTime: u(0),
    uAspect: u(1),
    uScale: u(P.scale),
    uCoverage: u(P.coverage),
    uPenumbra: u(P.penumbra),
    uPenumbraFar: u(P.penumbraFar),
    uSway: u(P.sway),
    uSwayPeriod: u(P.swayPeriod),
    uSwayPeriod2: u(P.swayPeriod2),
    uDrift: u(P.drift),
    uScroll: u(0),
    uShadow: u(P.shadow),
    uShadowTint: u(new Color()),
    uLight: u(P.light),
    uLightTint: u(new Color()),
  }
  const lightMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('leaves.frag'),
    uniforms: lightUniforms,
    depthTest: false,
    depthWrite: false,
  })
  const compositeUniforms = {
    tLight: u(target.texture),
    uSize: u(new Vector2(1, 1)),
    uGrain: u(P.grain),
    uFrame: u(0),
    uRect: u(new Vector4()),
  }
  const compositeMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('leaves-composite.frag'),
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
  })
  const lightScene = new Scene()
  const compositeScene = new Scene()
  const lightMesh = new Mesh(geometry, lightMaterial)
  const compositeMesh = new Mesh(geometry, compositeMaterial)
  lightMesh.frustumCulled = compositeMesh.frustumCulled = false
  lightScene.add(lightMesh)
  compositeScene.add(compositeMesh)

  let width = 1
  let height = 1
  let isMobile = false
  let elapsed = 0
  let frame = 0
  let visible = false
  const rect = { left: 0, bottom: 0, width: 0, height: 0 }

  function syncTarget() {
    const s = isMobile ? P.internalScaleMobile : P.internalScale
    const w = Math.max(1, Math.round(width * s))
    const h = Math.max(1, Math.round(height * s))
    if (w !== target.width || h !== target.height) target.setSize(w, h)
    compositeUniforms.uSize.value.set(w, h)
    lightUniforms.uAspect.value = width / height
  }

  function buildPane(f: FolderApi) {
    f.addBinding(P, 'shadow', { label: 'shadow amount', min: 0, max: 1, step: 0.01 })
    f.addBinding(P, 'shadowTint', { label: 'shadow tint' })
    f.addBinding(P, 'light', { label: 'sun warmth', min: 0, max: 1, step: 0.01 })
    f.addBinding(P, 'lightTint', { label: 'sun tint' })
    f.addBinding(P, 'scale', { min: 0.4, max: 4, step: 0.05 })
    f.addBinding(P, 'coverage', { label: 'leaf coverage', min: 0.2, max: 0.8, step: 0.01 })
    f.addBinding(P, 'penumbra', { min: 0.01, max: 0.4, step: 0.005 })
    f.addBinding(P, 'penumbraFar', { label: 'penumbra (far)', min: 0.01, max: 0.5, step: 0.005 })
    f.addBinding(P, 'sway', { min: 0, max: 0.06, step: 0.001 })
    f.addBinding(P, 'swayPeriod', { label: 'sway period (s)', min: 6, max: 20, step: 0.1 })
    f.addBinding(P, 'drift', { min: 0, max: 0.03, step: 0.0005 })
    f.addBinding(P, 'grain', { min: 0, max: 0.05, step: 0.001 })
    f.addBinding(P, 'internalScale', { label: 'internal scale', min: 0.2, max: 1, step: 0.05 }).on('change', syncTarget)
  }

  const scene: LeavesScene = {
    id: options.id ?? 'leaves',
    params: P,
    init(ctx) {
      width = ctx.width
      height = ctx.height
      isMobile = ctx.isMobile
      syncTarget()
      if (ctx.pane) buildPane(ctx.pane)
    },
    update(_time, delta) {
      if (!reducedMotion.value) elapsed += delta
      frame++
      const L = lightUniforms
      L.uTime.value = elapsed
      L.uScale.value = P.scale
      L.uCoverage.value = P.coverage
      L.uPenumbra.value = P.penumbra
      L.uPenumbraFar.value = P.penumbraFar
      L.uSway.value = P.sway
      L.uSwayPeriod.value = P.swayPeriod
      L.uSwayPeriod2.value = P.swayPeriod2
      L.uDrift.value = P.drift
      L.uShadow.value = P.shadow
      L.uLight.value = P.light
      // Raw display values (no sRGB → linear): this canvas is a multiply layer, the hex IS the multiplier.
      ;(L.uShadowTint.value as Color).setStyle(P.shadowTint, LinearSRGBColorSpace)
      ;(L.uLightTint.value as Color).setStyle(P.lightTint, LinearSRGBColorSpace)
      // The light is cast from outside onto the page: it mostly stays put while the page scrolls.
      L.uScroll.value = (-window.scrollY / height) * 0.12
      const C = compositeUniforms
      C.uGrain.value = P.grain
      C.uFrame.value = frame
      const sec = options.section()
      if (sec) {
        const r = sec.getBoundingClientRect()
        visible = r.bottom > 0 && r.top < height
        rect.left = r.left
        rect.bottom = r.bottom
        rect.width = r.width
        rect.height = r.height
      }
    },
    prewarm(r) {
      // Compile both programs in parallel first (non-blocking), then draw once to upload / settle.
      if (compileStage === 0) {
        compileStage = 1
        const prev = r.getRenderTarget()
        r.setRenderTarget(target)
        const a = r.compileAsync(lightScene, camera)
        r.setRenderTarget(null)
        const b = r.compileAsync(compositeScene, camera)
        r.setRenderTarget(prev)
        void Promise.all([a, b]).then(() => (compileStage = 2))
        return false
      }
      if (compileStage === 1) return false
      r.setRenderTarget(target)
      r.render(lightScene, camera)
      r.setRenderTarget(null)
      r.setScissor(0, 0, 1, 1)
      r.setScissorTest(true)
      r.render(compositeScene, camera)
      r.setScissorTest(false)
      return true
    },
    render(r) {
      if (!visible) return
      // Drawing-buffer px, y from the bottom (the live pixel ratio, not the one at init).
      const pr = r.getPixelRatio()
      compositeUniforms.uRect.value.set(rect.left * pr, (height - rect.bottom) * pr, rect.width * pr, rect.height * pr)
      r.setRenderTarget(target)
      r.render(lightScene, camera)
      r.setRenderTarget(null)
      r.render(compositeScene, camera)
    },
    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      syncTarget()
    },
    setActive() {},
    dispose() {
      geometry.dispose()
      lightMaterial.dispose()
      compositeMaterial.dispose()
      target.dispose()
      lightScene.clear()
      compositeScene.clear()
    },
  }
  return scene
}
