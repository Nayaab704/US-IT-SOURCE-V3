import {
  CapsuleGeometry,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type BufferGeometry,
  type IUniform,
} from 'three'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { RibbonEnvironment } from '~/utils/ribbon/environment'
import { ribbonParams } from '~/utils/ribbon/params'
import { loadShader } from '~/utils/shaders'
import { sheenParams as P } from './params'

/**
 * /about — the night line's background. A few large shapes in the hero ribbon's lacquer (its material
 * values and its studio environment, from the shipped bake — no PMREM stall), drifting very slowly
 * while the studio turns, so the inky violet sheen travels over them. They render small and are
 * upsampled (soft, out of focus) over the void, only inside the section's rect.
 */
export interface SheenScene extends StageScene {
  readonly params: typeof P
  /** Pinned scroll progress of the section (0–1): a slow parallax. */
  setProgress(p: number): void
  /** True once it has drawn on screen: the section can drop its CSS void and show the canvas. */
  readonly drawn: boolean
}

interface Shape {
  mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>
  home: Vector3
  phase: number
  spin: Vector3
}

export function createSheenScene(options: { id?: string; section: () => HTMLElement | null }): SheenScene {
  const reducedMotion = useReducedMotion()
  const u = <T>(value: T): IUniform<T> => ({ value })
  const M = ribbonParams.material

  const shapesScene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 16)
  const material = new MeshPhysicalMaterial({
    color: new Color(M.color),
    roughness: M.roughness,
    clearcoat: M.clearcoat,
    clearcoatRoughness: M.clearcoatRoughness,
    sheen: M.sheen,
    sheenColor: new Color(M.sheenColor).multiplyScalar(M.sheenGain / Math.max(M.envIntensity, 1e-3)),
    sheenRoughness: M.sheenRoughness,
  })
  shapesScene.environmentIntensity = M.envIntensity

  const geometries: BufferGeometry[] = []
  const shapes: Shape[] = []
  function addShape(geometry: BufferGeometry, home: [number, number, number], rot: [number, number, number], spin: [number, number, number]) {
    geometries.push(geometry)
    const mesh = new Mesh(geometry, material)
    mesh.rotation.set(...rot)
    shapesScene.add(mesh)
    shapes.push({ mesh, home: new Vector3(...home), phase: shapes.length * 2.1, spin: new Vector3(...spin) })
  }

  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter })
  const flatCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new PlaneGeometry(2, 2)
  const compositeUniforms = {
    tShapes: u(target.texture),
    uSize: u(new Vector2(1, 1)),
    uRect: u(new Vector4()),
    uVoid: u(new Color('#020306')),
    uStrength: u(P.strength),
    uExposure: u(P.exposure),
    uGrain: u(P.grain),
    uFrame: u(0),
  }
  const compositeMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('sheen-composite.frag'),
    uniforms: compositeUniforms,
    depthTest: false,
    depthWrite: false,
  })
  const compositeScene = new Scene()
  const compositeMesh = new Mesh(quad, compositeMaterial)
  compositeMesh.frustumCulled = false
  compositeScene.add(compositeMesh)

  let env: RibbonEnvironment | null = null
  let width = 1
  let height = 1
  let isMobile = false
  let elapsed = 0
  let frame = 0
  let progress = 0
  let visible = false
  let compileStage = 0
  let drawn = false
  const rect = { left: 0, bottom: 0, width: 0, height: 0 }

  function syncTarget() {
    const s = isMobile ? P.internalScaleMobile : P.internalScale
    const w = Math.max(1, Math.round(width * s))
    const h = Math.max(1, Math.round(height * s))
    if (w !== target.width || h !== target.height) target.setSize(w, h)
    compositeUniforms.uSize.value.set(w, h)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function buildPane(f: FolderApi) {
    f.addBinding(P, 'strength', { min: 0, max: 1, step: 0.01 })
    f.addBinding(P, 'exposure', { min: 0.2, max: 3, step: 0.01 })
    f.addBinding(P, 'internalScale', { label: 'internal scale', min: 0.1, max: 1, step: 0.01 }).on('change', syncTarget)
    f.addBinding(P, 'driftPeriod', { label: 'drift period (s)', min: 20, max: 200, step: 1 })
    f.addBinding(P, 'drift', { min: 0, max: 2, step: 0.01 })
    f.addBinding(P, 'envRotation', { label: 'studio turn', min: 0, max: 0.1, step: 0.001 })
    f.addBinding(P, 'parallax', { min: 0, max: 4, step: 0.05 })
    f.addBinding(P, 'grain', { min: 0, max: 0.05, step: 0.001 })
  }

  const scene: SheenScene = {
    id: options.id ?? 'sheen',
    params: P,
    setProgress(p) {
      progress = p
    },
    get drawn() {
      return drawn
    },
    async init(ctx) {
      width = ctx.width
      height = ctx.height
      isMobile = ctx.isMobile || ctx.isLowPower
      // Large, soft forms: a ring and two lozenges (one fewer on phones / low power).
      const seg = isMobile ? 24 : 48
      addShape(new TorusGeometry(3.2, 1.05, seg, seg * 2), [-4.6, 1.2, -2], [0.9, 0.3, 0.2], [0.05, 0.03, 0])
      addShape(new CapsuleGeometry(1.25, 4.2, seg / 2, seg), [4.4, -1.3, -1], [0.2, 0.1, 1.1], [0.02, 0.04, 0.01])
      if (!isMobile) addShape(new CapsuleGeometry(0.9, 2.8, seg / 2, seg), [0.6, 3.6, -5], [1.2, 0.4, -0.5], [0.03, -0.02, 0.02])
      syncTarget()
      env = new RibbonEnvironment(ctx.renderer)
      await env.load(ribbonParams.softboxes, ribbonParams.floor)
      shapesScene.environment = env.update(ribbonParams.softboxes, ribbonParams.floor)
      if (ctx.pane) buildPane(ctx.pane)
    },
    update(_time, delta) {
      if (!reducedMotion.value) elapsed += delta
      frame++
      const t = (elapsed / P.driftPeriod) * Math.PI * 2
      for (const s of shapes) {
        const m = s.mesh
        m.position.set(
          s.home.x + Math.sin(t + s.phase) * P.drift - (progress - 0.5) * P.parallax,
          s.home.y + Math.cos(t * 0.8 + s.phase) * P.drift * 0.6,
          s.home.z,
        )
        if (!reducedMotion.value) {
          m.rotation.x += s.spin.x * delta
          m.rotation.y += s.spin.y * delta
          m.rotation.z += s.spin.z * delta
        }
      }
      shapesScene.environmentRotation.y = elapsed * P.envRotation
      const C = compositeUniforms
      C.uStrength.value = P.strength
      C.uExposure.value = P.exposure
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
      // Compile both programs in parallel first (non-blocking), then draw once off screen.
      if (compileStage === 0) {
        compileStage = 1
        const prev = r.getRenderTarget()
        r.setRenderTarget(target)
        const a = r.compileAsync(shapesScene, camera)
        r.setRenderTarget(null)
        const b = r.compileAsync(compositeScene, flatCamera)
        r.setRenderTarget(prev)
        void Promise.all([a, b]).then(() => (compileStage = 2))
        return false
      }
      if (compileStage === 1) return false
      r.setRenderTarget(target)
      r.setClearColor(0x000000, 0)
      r.clear()
      r.render(shapesScene, camera)
      r.setRenderTarget(null)
      return true
    },
    render(r) {
      if (!visible) return
      const pr = r.getPixelRatio()
      compositeUniforms.uRect.value.set(rect.left * pr, (height - rect.bottom) * pr, rect.width * pr, rect.height * pr)
      r.setRenderTarget(target)
      r.setClearColor(0x000000, 0)
      r.clear()
      r.render(shapesScene, camera)
      r.setRenderTarget(null)
      r.render(compositeScene, flatCamera)
      drawn = true
    },
    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      syncTarget()
    },
    setActive() {},
    dispose() {
      geometries.forEach((g) => g.dispose())
      material.dispose()
      quad.dispose()
      compositeMaterial.dispose()
      target.dispose()
      env?.dispose()
      shapesScene.clear()
      compositeScene.clear()
    },
  }
  return scene
}
