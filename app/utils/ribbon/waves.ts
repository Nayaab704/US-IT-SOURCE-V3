import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { loadShader } from '~/utils/shaders'
import type { RibbonParams } from './params'

/** A cursor stroke on the ribbon this frame, in the ribbon's UV space. */
export interface WaveStroke {
  from: Vector2
  to: Vector2
  /** Impulse strength (already scaled by pointer speed). */
  strength: number
}

const MAX_STEP = 1 / 240

/**
 * The liquid surface: a damped wave equation on a small height field (ping-pong half-float
 * targets) in the ribbon's own UV space. A few fixed sub-steps per frame keep it stable at any
 * frame rate; the cost is a handful of small full-grid passes.
 */
export class RibbonWaves {
  private readonly targets: [WebGLRenderTarget, WebGLRenderTarget]
  private readonly material: ShaderMaterial
  private readonly quad: Mesh
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private current = 0
  /** Frames since the last impulse that still moved the surface (lets an idle surface stop simulating). */
  private quietTime = Infinity

  constructor(
    readonly width: number,
    readonly height: number,
    /** Wrap v round (a tube's perimeter). False for a flat sheet: both axes clamp at the edges. */
    options: { wrapV?: boolean } = {},
  ) {
    const make = () => {
      const t = new WebGLRenderTarget(width, height, {
        type: HalfFloatType,
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
      })
      t.texture.wrapS = ClampToEdgeWrapping
      t.texture.wrapT = options.wrapV === false ? ClampToEdgeWrapping : RepeatWrapping
      return t
    }
    this.targets = [make(), make()]
    this.material = new ShaderMaterial({
      vertexShader: loadShader('fullscreen.vert'),
      fragmentShader: loadShader('ribbon-wave.frag'),
      uniforms: {
        tState: { value: null },
        uTexel: { value: new Vector2(1 / width, 1 / height) },
        uCell: { value: new Vector2(0.05, 0.05) },
        uExtent: { value: new Vector2(25, 3) },
        uDt: { value: MAX_STEP },
        uSpeed: { value: 1 },
        uDamping: { value: 1 },
        uViscosity: { value: 0 },
        uRestore: { value: 0 },
        uStroke: { value: new Vector4() },
        uImpulse: { value: new Vector4() },
      },
      depthTest: false,
      depthWrite: false,
    })
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  /** The current state (r = height, g = velocity). */
  get texture(): Texture {
    return this.targets[this.current]!.texture
  }

  /** True while the surface may still be moving (an idle, settled surface is skipped). */
  get active() {
    return this.quietTime < 6
  }

  clear(renderer: WebGLRenderer) {
    const prev = renderer.getRenderTarget()
    for (const t of this.targets) {
      renderer.setRenderTarget(t)
      renderer.clear(true, false, false)
    }
    renderer.setRenderTarget(prev)
    this.quietTime = Infinity
  }

  /**
   * Advance by `delta` seconds. `extent` = world length of the path and perimeter (texel sizes).
   * The stroke is injected in the first sub-step only.
   */
  step(
    renderer: WebGLRenderer,
    delta: number,
    w: Pick<RibbonParams['waves'], 'speed' | 'damping' | 'viscosity' | 'restore' | 'radius'>,
    extent: Vector2,
    stroke: WaveStroke | null,
  ) {
    if (stroke) this.quietTime = 0
    else this.quietTime += delta
    if (!this.active) return
    // Sub-steps small enough for both the frame time and the wave's stability limit (c·dt/dx < ½).
    const cell = Math.min(extent.x / this.width, extent.y / this.height)
    const limit = Math.min(MAX_STEP, (0.45 * cell) / Math.max(w.speed, 0.01), (0.2 * cell * cell) / Math.max(w.viscosity, 1e-6))
    const steps = Math.min(12, Math.max(1, Math.ceil(Math.min(delta, 0.05) / limit)))
    const dt = Math.min(delta, 0.05, steps * limit) / steps
    const u = this.material.uniforms
    ;(u.uExtent!.value as Vector2).copy(extent)
    ;(u.uCell!.value as Vector2).set(extent.x / this.width, extent.y / this.height)
    u.uDt!.value = dt
    u.uSpeed!.value = w.speed
    u.uDamping!.value = w.damping
    u.uViscosity!.value = w.viscosity
    u.uRestore!.value = w.restore
    const prev = renderer.getRenderTarget()
    for (let i = 0; i < steps; i++) {
      const impulse = u.uImpulse!.value as Vector4
      if (stroke && i === 0) {
        ;(u.uStroke!.value as Vector4).set(stroke.from.x, stroke.from.y, stroke.to.x, stroke.to.y)
        // A velocity kick for this frame (the caller scales it by the frame time).
        impulse.set(stroke.strength, w.radius, 0, 0)
      } else impulse.set(0, w.radius, 0, 0)
      u.tState!.value = this.targets[this.current]!.texture
      this.current = 1 - this.current
      renderer.setRenderTarget(this.targets[this.current]!)
      renderer.render(this.scene, this.camera)
    }
    renderer.setRenderTarget(prev)
  }

  dispose() {
    for (const t of this.targets) t.dispose()
    this.material.dispose()
    this.quad.geometry.dispose()
    this.scene.clear()
  }
}
