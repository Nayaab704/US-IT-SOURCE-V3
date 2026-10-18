import {
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type IUniform,
  type WebGLRenderer,
} from 'three'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { loadShader } from '~/utils/shaders'
import {
  applyDayMobileOverrides,
  assignDayParams,
  dayPresetParams,
  type DayParams,
  type DayPresetName,
} from './params'

export interface DayScene extends StageScene {
  readonly params: DayParams
  applyPreset(name: DayPresetName): void
  /** Dev/testing: start a passing cloud now (deepest variant). */
  triggerCloud(): void
}

const TAU = Math.PI * 2

export function createDayScene(options: { id?: string; preset?: DayPresetName } = {}): DayScene {
  let presetName: DayPresetName = options.preset ?? 'problems'
  const params = dayPresetParams(presetName)
  let isMobile = false
  const reducedMotion = useReducedMotion()
  const pointer = usePointer()

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const vertexShader = loadShader('fullscreen.vert')
  const tmp = new Color()

  const u = <T>(value: T): IUniform<T> => ({ value })
  const lightUniforms = {
    uAspect: u(1),
    uPaper: u(new Vector3()),
    uTonal: u(0),
    uTonalScale: u(1),
    uOrigin: u(new Vector2()),
    uDir: u(new Vector2(-1, 0)),
    uLength: u(1),
    uWidth: u(1),
    uSpread: u(0),
    uSkew: u(0),
    uScale: u(1),
    uWarm: u(new Vector3(1, 1, 1)),
    uLight: u(1),
    uMullions: u(2),
    uTransom: u(0.35),
    uBar: u(0.04),
    uCool: u(new Vector3(1, 1, 1)),
    uShadow: u(1),
    uPenNear: u(0.01),
    uPenFar: u(0.08),
    uCurtain: u(0),
    uFolds: u(9),
    uSwayPhase: u(0),
  }
  const lightMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: loadShader('day.frag'),
    uniforms: lightUniforms,
    depthTest: false,
    depthWrite: false,
  })
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })
  const compositeUniforms = {
    uScene: u(target.texture),
    uSceneSize: u(new Vector2(1, 1)),
    uDpr: u(1),
    uFibre: u(0),
    uFibreScale: u(1),
    uGrain: u(0),
    uGrainSeed: u(0),
    uDither: u(1),
    uFrame: u(0),
    uOpacity: u(1),
  }
  const compositeMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: loadShader('day-composite.frag'),
    uniforms: compositeUniforms,
    // Fades in over the night atmosphere during a world crossfade.
    transparent: true,
    blending: NormalBlending,
    depthTest: false,
    depthWrite: false,
  })
  const lightScene = new Scene()
  lightScene.add(new Mesh(geometry, lightMaterial))
  const compositeScene = new Scene()
  compositeScene.add(new Mesh(geometry, compositeMaterial))

  let renderer: WebGLRenderer | null = null
  let width = 1
  let height = 1
  let elapsed = 0
  let frame = 0
  let pane: FolderApi | null = null

  // Clouds: random gaps, random depth, smooth envelope.
  let nextCloud = 0
  let cloudStart = -1
  let cloudDepth = 0
  let cloudDim = 0
  const randomBetween = (a: number, b: number) => a + Math.random() * (b - a)
  const scheduleCloud = () => (nextCloud = elapsed + randomBetween(params.clouds.minInterval, params.clouds.maxInterval))

  /** Hex → linear multiplier with the given luminance; only the tint's hue survives. */
  function tintMultiplier(hex: string, luminance: number, out: Vector3) {
    tmp.set(hex)
    const l = Math.max(0.2126 * tmp.r + 0.7152 * tmp.g + 0.0722 * tmp.b, 1e-4)
    out.set((tmp.r / l) * luminance, (tmp.g / l) * luminance, (tmp.b / l) * luminance)
  }

  function syncTarget() {
    if (!renderer) return
    const dpr = renderer.getPixelRatio()
    const w = Math.max(1, Math.round(width * dpr * params.quality.internalScale))
    const h = Math.max(1, Math.round(height * dpr * params.quality.internalScale))
    if (w !== target.width || h !== target.height) {
      target.setSize(w, h)
      compositeUniforms.uSceneSize.value.set(w, h)
    }
    compositeUniforms.uDpr.value = dpr
  }

  function updateClouds(frozen: boolean) {
    const C = params.clouds
    if (frozen || !C.enabled) {
      cloudDim = 0
      return
    }
    if (cloudStart < 0 && elapsed >= nextCloud) {
      cloudStart = elapsed
      cloudDepth = randomBetween(C.minDepth, C.maxDepth)
    }
    if (cloudStart >= 0) {
      const t = (elapsed - cloudStart) / Math.max(C.duration, 0.1)
      if (t >= 1) {
        cloudStart = -1
        cloudDim = 0
        scheduleCloud()
      } else {
        const s = Math.sin(Math.PI * t)
        cloudDim = cloudDepth * s * s
      }
    }
  }

  function syncUniforms(frozen: boolean) {
    const p = params
    const L = lightUniforms
    const aspect = width / height
    L.uAspect.value = aspect
    tmp.set(p.paper.color) // sRGB hex → linear working space
    L.uPaper.value.set(tmp.r, tmp.g, tmp.b)
    L.uTonal.value = p.paper.tonal
    L.uTonalScale.value = p.paper.tonalScale

    // Drift: incommensurate slow sines (slowest cycles 71–131 s) — wanders, never visibly loops.
    const t = elapsed
    const dx = p.drift.amount * (0.6 * Math.sin((TAU * t) / 71) + 0.4 * Math.sin((TAU * t) / 113 + 1.3))
    const dy = p.drift.amount * (0.6 * Math.sin((TAU * t) / 89 + 0.4) + 0.4 * Math.sin((TAU * t) / 131 + 2.1))
    const rot = p.drift.rotation * Math.sin((TAU * t) / 97 + 0.7)
    // Parallax: the pattern leans toward the cursor by at most `parallax` of the viewport.
    const px = frozen || !pointer.inside ? 0 : pointer.smoothX * p.pointer.parallax * aspect
    const py = frozen || !pointer.inside ? 0 : pointer.smoothY * p.pointer.parallax
    L.uOrigin.value.set(p.light.x * aspect + dx + px, p.light.y + dy + py)
    const a = (p.light.angle * Math.PI) / 180 + rot
    L.uDir.value.set(Math.cos(a), Math.sin(a))
    L.uLength.value = p.light.length
    L.uWidth.value = p.light.width
    L.uSpread.value = p.light.spread
    L.uSkew.value = p.light.skew
    L.uScale.value = isMobile ? p.mobileScale : 1

    tintMultiplier(p.light.tint, 1 + p.light.intensity, L.uWarm.value)
    tintMultiplier(p.frame.tint, 1 - p.frame.strength, L.uCool.value)
    // A passing cloud dims the light and, a little less, the shadows it casts.
    L.uLight.value = 1 - cloudDim
    L.uShadow.value = 1 - 0.7 * cloudDim
    L.uMullions.value = Math.round(Math.min(3, Math.max(1, p.frame.mullions)))
    L.uTransom.value = p.frame.transom
    L.uBar.value = p.frame.bar
    L.uPenNear.value = p.frame.penumbraNear
    L.uPenFar.value = p.frame.penumbraFar
    L.uCurtain.value = p.curtain.enabled ? p.curtain.strength : 0
    L.uFolds.value = p.curtain.folds
    L.uSwayPhase.value = p.curtain.sway * Math.sin((TAU * t) / 23) * 4

    const c = compositeUniforms
    c.uFibre.value = p.paper.fibre
    c.uFibreScale.value = p.paper.fibreScale
    c.uGrain.value = p.post.grain
    c.uDither.value = p.post.dither ? 1 : 0
  }

  function applyPreset(name: DayPresetName) {
    presetName = name
    assignDayParams(params, dayPresetParams(name))
    if (isMobile) applyDayMobileOverrides(params)
    pane?.refresh()
  }

  function buildPane(folder: FolderApi) {
    const P = params
    const state = { preset: presetName }
    folder
      .addBinding(state, 'preset', { options: { Problems: 'problems', Approach: 'approach', People: 'people' } })
      .on('change', (ev) => applyPreset(ev.value as DayPresetName))
    folder.addButton({ title: 'Pass a cloud now' }).on('click', () => triggerCloud())
    folder.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify(P, null, 2)
      console.info(`[day] params (${presetName}):\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })
    const q = folder.addFolder({ title: 'Quality', expanded: false })
    q.addBinding(P.quality, 'internalScale', { min: 0.2, max: 1, step: 0.05 })
    q.addBinding(P, 'timeScale', { min: 0, max: 20, step: 0.1 })
    const pa = folder.addFolder({ title: 'Paper', expanded: false })
    pa.addBinding(P.paper, 'color')
    pa.addBinding(P.paper, 'tonal', { min: 0, max: 0.1, step: 0.001 })
    pa.addBinding(P.paper, 'tonalScale', { min: 0.1, max: 4, step: 0.01 })
    pa.addBinding(P.paper, 'fibre', { min: 0, max: 0.06, step: 0.001 })
    pa.addBinding(P.paper, 'fibreScale', { min: 0.25, max: 4, step: 0.05 })
    const li = folder.addFolder({ title: 'Window light', expanded: false })
    li.addBinding(P.light, 'x', { min: -0.5, max: 1.5, step: 0.005 })
    li.addBinding(P.light, 'y', { min: -0.5, max: 1.5, step: 0.005 })
    li.addBinding(P.light, 'angle', { min: 90, max: 360, step: 0.5 })
    li.addBinding(P.light, 'length', { min: 0.2, max: 3, step: 0.01 })
    li.addBinding(P.light, 'width', { min: 0.1, max: 2, step: 0.01 })
    li.addBinding(P.light, 'spread', { min: 0, max: 2, step: 0.01 })
    li.addBinding(P.light, 'skew', { min: -1, max: 1, step: 0.01 })
    li.addBinding(P.light, 'intensity', { min: 0, max: 0.2, step: 0.001 })
    li.addBinding(P.light, 'tint')
    const fr = folder.addFolder({ title: 'Window frame shadow', expanded: false })
    fr.addBinding(P.frame, 'mullions', { min: 1, max: 3, step: 1 })
    fr.addBinding(P.frame, 'transom', { min: 0.05, max: 0.95, step: 0.005 })
    fr.addBinding(P.frame, 'bar', { min: 0.005, max: 0.15, step: 0.001 })
    fr.addBinding(P.frame, 'strength', { min: 0, max: 0.2, step: 0.001 })
    fr.addBinding(P.frame, 'tint')
    fr.addBinding(P.frame, 'penumbraNear', { min: 0, max: 0.1, step: 0.001 })
    fr.addBinding(P.frame, 'penumbraFar', { min: 0, max: 0.3, step: 0.001 })
    const dr = folder.addFolder({ title: 'Drift', expanded: false })
    dr.addBinding(P.drift, 'amount', { min: 0, max: 0.2, step: 0.001 })
    dr.addBinding(P.drift, 'rotation', { min: 0, max: 0.2, step: 0.001 })
    const cl = folder.addFolder({ title: 'Clouds', expanded: false })
    cl.addBinding(P.clouds, 'enabled')
    cl.addBinding(P.clouds, 'minInterval', { min: 2, max: 120, step: 1 })
    cl.addBinding(P.clouds, 'maxInterval', { min: 2, max: 180, step: 1 })
    cl.addBinding(P.clouds, 'minDepth', { min: 0, max: 0.5, step: 0.005 })
    cl.addBinding(P.clouds, 'maxDepth', { min: 0, max: 0.5, step: 0.005 })
    cl.addBinding(P.clouds, 'duration', { min: 1, max: 30, step: 0.5 })
    const cu = folder.addFolder({ title: 'Sheer curtain', expanded: false })
    cu.addBinding(P.curtain, 'enabled')
    cu.addBinding(P.curtain, 'strength', { min: 0, max: 0.15, step: 0.001 })
    cu.addBinding(P.curtain, 'folds', { min: 1, max: 30, step: 0.5 })
    cu.addBinding(P.curtain, 'sway', { min: 0, max: 2, step: 0.01 })
    const po = folder.addFolder({ title: 'Pointer + post', expanded: false })
    po.addBinding(P.pointer, 'parallax', { min: 0, max: 0.05, step: 0.001 })
    po.addBinding(P.post, 'grain', { min: 0, max: 0.1, step: 0.001 })
    po.addBinding(P.post, 'dither')
    po.addBinding(P, 'mobileScale', { min: 0.2, max: 1.5, step: 0.01 })
  }

  function triggerCloud() {
    cloudStart = elapsed
    cloudDepth = params.clouds.maxDepth
  }

  const scene: DayScene = {
    id: options.id ?? 'day',
    params,
    applyPreset,
    triggerCloud,

    init(ctx) {
      renderer = ctx.renderer
      width = ctx.width
      height = ctx.height
      isMobile = ctx.isMobile || ctx.isLowPower
      if (isMobile) applyDayMobileOverrides(params)
      scheduleCloud()
      pane = ctx.pane
      if (pane) buildPane(pane)
      if (import.meta.dev) {
        ;(window as Window & { __day?: () => { scene: DayScene; cloudDim: number; elapsed: number } }).__day = () => ({
          scene,
          cloudDim,
          elapsed,
        })
      }
      syncTarget()
    },

    setWorldWeight(weight) {
      compositeUniforms.uOpacity.value = weight
    },

    update(_time, delta) {
      // Reduced motion: frozen light, composed at t = 0, no clouds, no parallax.
      const frozen = reducedMotion.value
      const dt = frozen ? 0 : delta * params.timeScale
      elapsed += dt
      updateClouds(frozen)
      if (!frozen) {
        frame++
        compositeUniforms.uFrame.value = frame
        compositeUniforms.uGrainSeed.value = ((frame * 0.618034) % 1) * 1000
      }
      syncUniforms(frozen)
      syncTarget()
    },

    render(r) {
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
      renderer = null
      pane = null
    },
  }
  return scene
}
