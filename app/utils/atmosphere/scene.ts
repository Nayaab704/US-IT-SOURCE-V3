import {
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
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
import { inverseAces, type RGB } from './aces'
import {
  applyLowPowerOverrides,
  assignParams,
  presetParams,
  type AtmosphereLight,
  type AtmosphereParams,
  type AtmospherePresetName,
} from './params'

export interface AtmosphereScene extends StageScene {
  readonly params: AtmosphereParams
  applyPreset(name: AtmospherePresetName): void
}

// Fixed start so the composition is identical on every load (art review needs repeatability).
const START_OFFSET = new Vector3(11.3, 4.7, 0)
const NEAR_START_OFFSET = new Vector3(-3.1, 8.2, 20)
const MAX_STIR = 0.2

export function createAtmosphereScene(
  options: { id?: string; preset?: AtmospherePresetName } = {},
): AtmosphereScene {
  let presetName: AtmospherePresetName = options.preset ?? 'hero'
  const params = presetParams(presetName)
  let lowPower = false
  const reducedMotion = useReducedMotion()

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const vertexShader = loadShader('fullscreen.vert')

  const fogOffset = START_OFFSET.clone()
  const nearOffset = NEAR_START_OFFSET.clone()
  const stirPos = new Vector2()
  const stirVec = new Vector2()
  const tmpColor = new Color()

  const u = <T>(value: T): IUniform<T> => ({ value })
  const fogUniforms = {
    uAspect: u(1),
    uScroll: u(0),
    uBaseTop: u(new Vector3()),
    uBaseBottom: u(new Vector3()),
    uBaseVariation: u(0),
    uFogScale: u(1),
    uFogStretch: u(1),
    uFogDensity: u(1),
    uFogContrast: u(1),
    uFogWarp: u(0),
    uFogAmbient: u(0),
    uOctaves: u(3),
    uFogOffset: u(fogOffset),
    uNearOffset: u(nearOffset),
    uNearAmount: u(0),
    uNearScale: u(1),
    uKeyPos: u(new Vector2()),
    uKeyColor: u(new Color()),
    uKeyRadius: u(1),
    uKeyIntensity: u(0),
    uFillPos: u(new Vector2()),
    uFillColor: u(new Color()),
    uFillRadius: u(1),
    uFillIntensity: u(0),
    uAccentPos: u(new Vector2()),
    uAccentColor: u(new Color()),
    uAccentRadius: u(1),
    uAccentIntensity: u(0),
    uScatterFog: u(0),
    uScatterAir: u(0),
    uHalo: u(0),
    uFalloff: u(1),
    uShafts: u(0),
    uShaftSteps: u(8),
    uShaftLength: u(0.5),
    uScrollShift: u(new Vector2()),
    uScrollTint: u(new Color()),
    uStirPos: u(stirPos),
    uStirVec: u(stirVec),
    uStirRadius: u(0.2),
  }
  const fogMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: loadShader('atmosphere.frag'),
    uniforms: fogUniforms,
    depthTest: false,
    depthWrite: false,
  })

  // HDR intermediate: half float keeps the dark end smooth before tone mapping.
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })

  const compositeUniforms = {
    uScene: u(target.texture),
    uSceneSize: u(new Vector2(1, 1)),
    uAspect: u(1),
    uExposure: u(1),
    uVignette: u(0),
    uGrain: u(0),
    uGrainSeed: u(0),
    uDither: u(1),
    uFrame: u(0),
  }
  const compositeMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader: loadShader('atmosphere-composite.frag'),
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
  })

  const fogScene = new Scene()
  fogScene.add(new Mesh(geometry, fogMaterial))
  const compositeScene = new Scene()
  compositeScene.add(new Mesh(geometry, compositeMaterial))

  let renderer: WebGLRenderer | null = null
  let width = 1
  let height = 1
  let frame = 0
  let pane: FolderApi | null = null

  // Inverting ACES is cheap but not free; recompute only when inputs change.
  let baseKey = ''
  function updateBase(exposure: number) {
    const key = `${params.base.top}|${params.base.bottom}|${exposure}`
    if (key === baseKey) return
    baseKey = key
    const invert = (hex: string, out: Vector3) => {
      tmpColor.set(hex) // sRGB hex → linear working space
      const x = inverseAces([tmpColor.r, tmpColor.g, tmpColor.b] as RGB)
      out.set(x[0] / exposure, x[1] / exposure, x[2] / exposure)
    }
    invert(params.base.top, fogUniforms.uBaseTop.value)
    invert(params.base.bottom, fogUniforms.uBaseBottom.value)
  }

  function syncTargetSize() {
    if (!renderer) return
    const dpr = renderer.getPixelRatio()
    const w = Math.max(1, Math.round(width * dpr * params.quality.internalScale))
    const h = Math.max(1, Math.round(height * dpr * params.quality.internalScale))
    if (w !== target.width || h !== target.height) {
      target.setSize(w, h)
      compositeUniforms.uSceneSize.value.set(w, h)
    }
  }

  // Colours are authored as they should look on screen: a light at intensity 1 shows exactly its
  // hex, not an ACES-shifted version of it. Cached because hex parsing + inversion runs per frame.
  const displayCache = new Map<string, RGB>()
  function setDisplayColor(hex: string, out: Color) {
    let rgb = displayCache.get(hex)
    if (!rgb) {
      tmpColor.set(hex)
      rgb = inverseAces([tmpColor.r, tmpColor.g, tmpColor.b])
      displayCache.set(hex, rgb)
    }
    out.setRGB(rgb[0], rgb[1], rgb[2])
  }

  function setLight(l: AtmosphereLight, pos: Vector2, color: Color, radius: IUniform<number>, intensity: IUniform<number>) {
    pos.set(l.x, l.y)
    setDisplayColor(l.color, color)
    radius.value = l.radius
    intensity.value = l.intensity
  }

  function syncUniforms(exposure: number) {
    const p = params
    const f = fogUniforms
    updateBase(exposure)
    f.uBaseVariation.value = p.base.variation
    f.uFogScale.value = p.fog.scale
    f.uFogStretch.value = p.fog.stretch
    f.uFogDensity.value = p.fog.density
    f.uFogContrast.value = p.fog.contrast
    f.uFogWarp.value = p.fog.warp
    f.uFogAmbient.value = p.fog.ambient
    f.uOctaves.value = Math.round(p.quality.octaves)
    f.uNearAmount.value = p.fog.nearAmount
    f.uNearScale.value = p.fog.nearScale
    setLight(p.key, f.uKeyPos.value, f.uKeyColor.value, f.uKeyRadius, f.uKeyIntensity)
    setLight(p.fill, f.uFillPos.value, f.uFillColor.value, f.uFillRadius, f.uFillIntensity)
    setLight(p.accent, f.uAccentPos.value, f.uAccentColor.value, f.uAccentRadius, f.uAccentIntensity)
    f.uScatterFog.value = p.scatter.fog
    f.uScatterAir.value = p.scatter.air
    f.uHalo.value = p.scatter.halo
    f.uFalloff.value = p.scatter.falloff
    f.uShafts.value = p.shafts.enabled ? p.shafts.intensity : 0
    f.uShaftSteps.value = Math.round(p.shafts.steps)
    f.uShaftLength.value = p.shafts.length
    f.uScrollShift.value.set(p.scroll.shiftX, p.scroll.shiftY)
    f.uScrollTint.value.set(p.scroll.tint)
    f.uStirRadius.value = p.stir.radius

    const c = compositeUniforms
    c.uExposure.value = exposure
    c.uVignette.value = p.post.vignette
    c.uGrain.value = p.post.grain
    c.uDither.value = p.post.dither ? 1 : 0
  }

  function applyPreset(name: AtmospherePresetName) {
    presetName = name
    assignParams(params, presetParams(name))
    if (lowPower) applyLowPowerOverrides(params)
    pane?.refresh()
  }

  function buildPane(folder: FolderApi) {
    const state = { preset: presetName }
    folder
      .addBinding(state, 'preset', { options: { Hero: 'hero', Services: 'services', Contact: 'contact' } })
      .on('change', (ev) => applyPreset(ev.value as AtmospherePresetName))
    folder.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify(params, null, 2)
      console.info(`[atmosphere] params (${presetName}):\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })

    const q = folder.addFolder({ title: 'Quality', expanded: false })
    q.addBinding(params.quality, 'internalScale', { min: 0.25, max: 1, step: 0.05 })
    q.addBinding(params.quality, 'octaves', { min: 1, max: 3, step: 1 })
    q.addBinding(params, 'timeScale', { min: 0, max: 10, step: 0.1 })

    const b = folder.addFolder({ title: 'Base', expanded: false })
    b.addBinding(params.base, 'top')
    b.addBinding(params.base, 'bottom')
    b.addBinding(params.base, 'variation', { min: 0, max: 1, step: 0.01 })

    const fg = folder.addFolder({ title: 'Fog', expanded: false })
    fg.addBinding(params.fog, 'scale', { min: 0.2, max: 5, step: 0.01 })
    fg.addBinding(params.fog, 'stretch', { min: 0.2, max: 2, step: 0.01 })
    fg.addBinding(params.fog, 'density', { min: 0, max: 2, step: 0.01 })
    fg.addBinding(params.fog, 'contrast', { min: 0.2, max: 3, step: 0.01 })
    fg.addBinding(params.fog, 'warp', { min: 0, max: 3, step: 0.01 })
    fg.addBinding(params.fog, 'driftX', { min: -0.05, max: 0.05, step: 0.001 })
    fg.addBinding(params.fog, 'driftY', { min: -0.05, max: 0.05, step: 0.001 })
    fg.addBinding(params.fog, 'evolve', { min: 0, max: 0.1, step: 0.001 })
    fg.addBinding(params.fog, 'ambient', { min: 0, max: 2, step: 0.01 })
    fg.addBinding(params.fog, 'nearAmount', { min: 0, max: 1, step: 0.01 })
    fg.addBinding(params.fog, 'nearScale', { min: 0.1, max: 2, step: 0.01 })
    fg.addBinding(params.fog, 'nearParallax', { min: 0, max: 5, step: 0.1 })

    const lightFolder = (title: string, l: AtmosphereLight) => {
      const lf = folder.addFolder({ title, expanded: false })
      lf.addBinding(l, 'x', { min: -0.5, max: 1.5, step: 0.01 })
      lf.addBinding(l, 'y', { min: -0.5, max: 1.5, step: 0.01 })
      lf.addBinding(l, 'radius', { min: 0.05, max: 3, step: 0.01 })
      lf.addBinding(l, 'color')
      lf.addBinding(l, 'intensity', { min: 0, max: 3, step: 0.005 })
    }
    lightFolder('Key light', params.key)
    lightFolder('Fill light', params.fill)
    lightFolder('Accent light', params.accent)

    const sc = folder.addFolder({ title: 'Scattering', expanded: false })
    sc.addBinding(params.scatter, 'fog', { min: 0, max: 3, step: 0.01 })
    sc.addBinding(params.scatter, 'air', { min: 0, max: 2, step: 0.01 })
    sc.addBinding(params.scatter, 'halo', { min: 0, max: 3, step: 0.01 })
    sc.addBinding(params.scatter, 'falloff', { min: 0.2, max: 6, step: 0.01 })

    const sh = folder.addFolder({ title: 'Shafts', expanded: false })
    sh.addBinding(params.shafts, 'enabled')
    sh.addBinding(params.shafts, 'intensity', { min: 0, max: 1, step: 0.005 })
    sh.addBinding(params.shafts, 'steps', { min: 2, max: 16, step: 1 })
    sh.addBinding(params.shafts, 'length', { min: 0.05, max: 1, step: 0.01 })

    const sr = folder.addFolder({ title: 'Scroll response', expanded: false })
    sr.addBinding(params.scroll, 'shiftX', { min: -0.5, max: 0.5, step: 0.005 })
    sr.addBinding(params.scroll, 'shiftY', { min: -0.5, max: 0.5, step: 0.005 })
    sr.addBinding(params.scroll, 'tint')

    const st = folder.addFolder({ title: 'Pointer stir', expanded: false })
    st.addBinding(params.stir, 'strength', { min: 0, max: 2, step: 0.01 })
    st.addBinding(params.stir, 'radius', { min: 0.02, max: 1, step: 0.01 })
    st.addBinding(params.stir, 'relax', { min: 0.1, max: 6, step: 0.05 })

    const po = folder.addFolder({ title: 'Post', expanded: false })
    po.addBinding(params.post, 'exposure', { min: 0, max: 3, step: 0.01 })
    po.addBinding(params.post, 'vignette', { min: 0, max: 1, step: 0.01 })
    po.addBinding(params.post, 'grain', { min: 0, max: 0.2, step: 0.001 })
    po.addBinding(params.post, 'dither')
  }

  return {
    id: options.id ?? 'atmosphere',
    params,
    applyPreset,

    init(ctx) {
      renderer = ctx.renderer
      lowPower = ctx.isMobile || ctx.isLowPower
      if (lowPower) applyLowPowerOverrides(params)
      pane = ctx.pane
      if (pane) buildPane(pane)
    },

    update(_time, delta, scrollProgress, pointer) {
      const frozen = reducedMotion.value
      const dt = frozen ? 0 : delta * params.timeScale
      const aspect = width / height

      // CPU-integrated offsets: changing a speed never makes the fog jump.
      fogOffset.x += params.fog.driftX * dt
      fogOffset.y += params.fog.driftY * dt
      fogOffset.z += params.fog.evolve * dt
      nearOffset.x += params.fog.driftX * params.fog.nearParallax * dt
      nearOffset.y += params.fog.driftY * params.fog.nearParallax * dt
      nearOffset.z += params.fog.evolve * 1.3 * dt

      // Stir accumulates pointer velocity and relaxes exponentially — viscous, never springy.
      stirPos.set((pointer.smoothX * 0.5 + 0.5) * aspect, pointer.smoothY * 0.5 + 0.5)
      if (!frozen && pointer.inside) {
        stirVec.x += pointer.vx * 0.5 * aspect * delta * params.stir.strength
        stirVec.y += pointer.vy * 0.5 * delta * params.stir.strength
      }
      stirVec.multiplyScalar(Math.exp(-delta / Math.max(params.stir.relax, 0.01)))
      if (stirVec.length() > MAX_STIR) stirVec.setLength(MAX_STIR)

      fogUniforms.uAspect.value = aspect
      fogUniforms.uScroll.value = scrollProgress
      compositeUniforms.uAspect.value = aspect
      if (!frozen) {
        frame++
        compositeUniforms.uFrame.value = frame
        compositeUniforms.uGrainSeed.value = (frame * 0.618034) % 1 * 1000
      }

      const exposure = params.post.exposure * (renderer?.toneMappingExposure ?? 1)
      syncUniforms(exposure)
      syncTargetSize()
    },

    render(r) {
      r.setRenderTarget(target)
      r.render(fogScene, camera)
      r.setRenderTarget(null)
      r.render(compositeScene, camera)
    },

    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      syncTargetSize()
    },

    setActive() {},

    dispose() {
      geometry.dispose()
      fogMaterial.dispose()
      compositeMaterial.dispose()
      target.dispose()
      fogScene.clear()
      compositeScene.clear()
      renderer = null
      pane = null
    },
  }
}
