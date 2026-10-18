import {
  Color,
  DirectionalLight,
  Euler,
  HalfFloatType,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  NormalBlending,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { FolderApi } from 'tweakpane'
import type { StageScene } from '~/composables/useStage'
import { loadShader } from '~/utils/shaders'
import { piecesParams as params } from './params'
import { PieceSimulation, type Body, type PointerField } from './physics'
import { buildPieceGeometry, PLACEHOLDER_PIECE_PATHS, type PieceGeometry } from './shapes'

export interface KeyLightSource {
  /** Viewport UV of the atmosphere's key light (may be off-screen) and its colour. */
  x: number
  y: number
  color: string
}

export interface PiecesSceneOptions {
  id?: string
  /** SVG path data for the pieces; defaults to the placeholder outlines. */
  paths?: readonly string[]
  /** Live link to the atmosphere's key light, so pieces and fog share one light source. */
  keyLight?: () => KeyLightSource
}

const FOV = 30
const CAMERA_Z = 20
const TAN_HALF = Math.tan(((FOV / 2) * Math.PI) / 180)

/** Small deterministic PRNG — the composition must be identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Placement {
  body: Body
  /** Anchor in viewport fractions (0–1, origin bottom-left) — re-projected on resize. */
  u: number
  v: number
  shape: number
  material: 'aluminium' | 'ceramic'
}

export function createPiecesScene(options: PiecesSceneOptions = {}): StageScene {
  const paths = options.paths ?? PLACEHOLDER_PIECE_PATHS
  const reducedMotion = useReducedMotion()
  const pointer = usePointer()

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  camera.position.set(0, 0, CAMERA_Z)
  const front = new Scene()
  const far = new Scene()

  const aluminium = new MeshPhysicalMaterial({ metalness: 1 })
  const ceramic = new MeshPhysicalMaterial({ metalness: 0 })
  const keyFront = new DirectionalLight()
  const keyFar = new DirectionalLight()
  front.add(keyFront, keyFront.target)
  far.add(keyFar, keyFar.target)

  // Far layer: rendered small, upscaled smoothly (soft like DOF), dimmed, and blended over the fog.
  // MSAA: bevel highlights are sub-pixel at this resolution and would alias into dotted lines.
  const farTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, samples: 4 })
  const quadGeometry = new PlaneGeometry(2, 2)
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const farMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('pieces-far.frag'),
    uniforms: {
      uLayer: { value: farTarget.texture },
      uLayerSize: { value: new Vector2(1, 1) },
      uExposure: { value: 1 },
      uDim: { value: params.look.farDim },
      uOpacity: { value: params.look.farOpacity },
    },
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthTest: false,
    depthWrite: false,
  })
  const farQuad = new Scene()
  farQuad.add(new Mesh(quadGeometry, farMaterial))

  let renderer: WebGLRenderer | null = null
  let envTarget: WebGLRenderTarget | null = null
  let geometries: PieceGeometry[] = []
  let placements: Placement[] = []
  let meshes: { mesh: InstancedMesh; bodies: Body[] }[] = []
  let sim: PieceSimulation | null = null
  let width = 1
  let height = 1

  const field: PointerField = {
    active: false,
    positions: [new Vector3(), new Vector3(), new Vector3()],
    velocities: [new Vector3(), new Vector3(), new Vector3()],
    speedNdc: 0,
  }
  const layerZ = () => [params.layout.nearZ, params.layout.midZ, params.layout.farZ] as const
  const halfHeightAt = (z: number) => (CAMERA_Z - z) * TAN_HALF

  function layout(isMobile: boolean) {
    const L = params.layout
    const rand = mulberry32(L.seed)
    const count = isMobile ? L.countMobile : L.count
    const nNear = Math.round(count * L.nearShare)
    const nMid = Math.round(count * L.midShare)
    const perLayer = [nNear, nMid, count - nNear - nMid]
    const scales = [L.nearScale, L.midScale, L.farScale]
    const result: Placement[] = []
    let shapeCursor = Math.floor(rand() * paths.length)

    perLayer.forEach((n, layer) => {
      // Jittered grid per layer: even coverage without visible rows.
      const cols = Math.max(1, Math.round(Math.sqrt(n * 1.6)))
      const rows = Math.max(1, Math.ceil(n / cols))
      const cells = Array.from({ length: cols * rows }, (_, i) => i).sort(() => rand() - 0.5)
      let placed = 0
      for (const cell of cells) {
        if (placed >= n) break
        const cx = (cell % cols) + 0.5
        const cy = Math.floor(cell / cols) + 0.5
        const u = 0.06 + ((cx + (rand() - 0.5) * 0.8) / cols) * 0.88
        const v = 0.08 + ((cy + (rand() - 0.5) * 0.8) / rows) * 0.84
        // Keep the copy area (bottom-left) clear — far pieces too, they read as smudges on the type.
        if (u < L.excludeX && v < L.excludeY) continue
        const shape = shapeCursor++ % paths.length
        const g = geometries[shape]!
        const scale = scales[layer]! * (1 + L.scaleJitter * (rand() * 2 - 1))
        const radius = g.radius * scale
        const mass = Math.max(radius * radius, 0.05)
        const anchorRotation = new Quaternion().setFromEuler(
          new Euler(L.tilt * (rand() * 2 - 1), L.tilt * (rand() * 2 - 1), rand() * Math.PI * 2),
        )
        const seeds = Array.from({ length: 6 }, (_, i) => (i < 3 ? 0.6 + rand() * 0.8 : rand() * Math.PI * 2))
        result.push({
          u,
          v,
          shape,
          material: rand() < 0.5 ? 'aluminium' : 'ceramic',
          body: {
            layer: layer as 0 | 1 | 2,
            position: new Vector3(),
            velocity: new Vector3(),
            rotation: anchorRotation.clone(),
            angular: new Vector3(),
            anchor: new Vector3(),
            anchorRotation,
            scale,
            radius,
            mass,
            inertia: 0.4 * mass * radius * radius,
            seeds: seeds as Body['seeds'],
          },
        })
        placed++
      }
    })
    return result
  }

  /** Anchors live in viewport fractions; re-project them whenever the aspect changes. */
  function projectAnchors(snap: boolean) {
    const aspect = width / height
    const zs = layerZ()
    for (const p of placements) {
      const z = zs[p.body.layer]
      const hh = halfHeightAt(z)
      p.body.anchor.set((p.u * 2 - 1) * hh * aspect, (p.v * 2 - 1) * hh, z)
      if (snap) p.body.position.copy(p.body.anchor)
    }
  }

  function buildMeshes() {
    const groups = new Map<string, { shape: number; material: MeshPhysicalMaterial; farLayer: boolean; bodies: Body[] }>()
    for (const p of placements) {
      const farLayer = p.body.layer === 2
      const key = `${p.shape}|${p.material}|${farLayer}`
      let g = groups.get(key)
      if (!g) {
        g = { shape: p.shape, material: p.material === 'aluminium' ? aluminium : ceramic, farLayer, bodies: [] }
        groups.set(key, g)
      }
      g.bodies.push(p.body)
    }
    meshes = [...groups.values()].map((g) => {
      const mesh = new InstancedMesh(geometries[g.shape]!.geometry, g.material, g.bodies.length)
      mesh.frustumCulled = false // instances move; the static bounding sphere would be wrong
      ;(g.farLayer ? far : front).add(mesh)
      return { mesh, bodies: g.bodies }
    })
  }

  const _m = new Matrix4()
  const _s = new Vector3()
  function writeInstances() {
    for (const { mesh, bodies } of meshes) {
      bodies.forEach((b, i) => mesh.setMatrixAt(i, _m.compose(b.position, b.rotation, _s.setScalar(b.scale))))
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  const _c = new Color()
  function syncLook() {
    const k = options.keyLight?.()
    const aspect = width / height
    // Same direction as the atmosphere's key light: its screen position, pushed toward the viewer.
    const kx = k ? (k.x - 0.5) * 2 * aspect : 1
    const ky = k ? (k.y - 0.5) * 2 : 1
    for (const light of [keyFront, keyFar]) {
      light.position.set(kx * 10, ky * 10, 12)
      light.color.set(k?.color ?? '#ffffff')
      light.intensity = params.look.keyIntensity
    }
    const L = params.look
    aluminium.color.set(_c.set(L.aluminium.color))
    aluminium.roughness = L.aluminium.roughness
    aluminium.anisotropy = L.aluminium.anisotropy
    ceramic.color.set(_c.set(L.ceramic.color))
    ceramic.roughness = L.ceramic.roughness
    ceramic.clearcoat = L.ceramic.clearcoat
    ceramic.clearcoatRoughness = L.ceramic.clearcoatRoughness
    front.environmentIntensity = L.envIntensity
    far.environmentIntensity = L.envIntensity
    const u = farMaterial.uniforms
    u.uDim!.value = L.farDim
    u.uOpacity!.value = L.farOpacity
    u.uExposure!.value = renderer?.toneMappingExposure ?? 1
  }

  function syncFarTarget() {
    if (!renderer) return
    const s = renderer.getPixelRatio() * params.look.farResolution
    const w = Math.max(1, Math.round(width * s))
    const h = Math.max(1, Math.round(height * s))
    if (w !== farTarget.width || h !== farTarget.height) {
      farTarget.setSize(w, h)
      ;(farMaterial.uniforms.uLayerSize!.value as Vector2).set(w, h)
    }
  }

  function updateField() {
    const active = pointer.inside && !reducedMotion.value
    field.active = active
    field.speedNdc = Math.hypot(pointer.vx, pointer.vy)
    if (!active) return
    const aspect = width / height
    layerZ().forEach((z, i) => {
      const hh = halfHeightAt(z)
      field.positions[i]!.set(pointer.smoothX * hh * aspect, pointer.smoothY * hh, z)
      field.velocities[i]!.set(pointer.vx * hh * aspect, pointer.vy * hh, 0)
    })
  }

  function buildPane(f: FolderApi) {
    const P = params
    const idle = f.addFolder({ title: 'Idle drift', expanded: false })
    idle.addBinding(P.idle, 'amplitude', { min: 0, max: 1, step: 0.01 })
    idle.addBinding(P.idle, 'speed', { min: 0, max: 1, step: 0.01 })
    idle.addBinding(P.idle, 'rotation', { min: 0, max: 0.5, step: 0.005 })
    const po = f.addFolder({ title: 'Pointer', expanded: false })
    po.addBinding(P.pointer, 'radius', { min: 0.2, max: 8, step: 0.05 })
    po.addBinding(P.pointer, 'push', { min: 0, max: 5, step: 0.01 })
    po.addBinding(P.pointer, 'deadzone', { min: 0, max: 2, step: 0.01 })
    po.addBinding(P.pointer, 'tilt', { min: 0, max: 3, step: 0.01 })
    po.addBinding(P.pointer, 'spin', { min: 0, max: 3, step: 0.01 })
    po.addBinding(P.pointer, 'depthPush', { min: 0, max: 2, step: 0.01 })
    po.addBinding(P.pointer, 'farFactor', { min: 0, max: 1, step: 0.01 })
    const ph = f.addFolder({ title: 'Physics', expanded: false })
    ph.addBinding(P.physics, 'anchorStiffness', { min: 0.05, max: 10, step: 0.01 })
    ph.addBinding(P.physics, 'linearDrag', { min: 0, max: 12, step: 0.01 })
    ph.addBinding(P.physics, 'rotStiffness', { min: 0, max: 5, step: 0.01 })
    ph.addBinding(P.physics, 'angularDrag', { min: 0, max: 8, step: 0.01 })
    ph.addBinding(P.physics, 'collisions')
    ph.addBinding(P.physics, 'restitution', { min: 0, max: 1, step: 0.01 })
    ph.addBinding(P.physics, 'collisionScale', { min: 0.2, max: 1.5, step: 0.01 })
    ph.addBinding(P.physics, 'collisionSoftness', { min: 0.01, max: 1, step: 0.01 })
    const lk = f.addFolder({ title: 'Look', expanded: false })
    lk.addBinding(P.look, 'keyIntensity', { min: 0, max: 15, step: 0.05 })
    lk.addBinding(P.look, 'envIntensity', { min: 0, max: 3, step: 0.01 })
    lk.addBinding(P.look.aluminium, 'color', { label: 'alu color' })
    lk.addBinding(P.look.aluminium, 'roughness', { label: 'alu rough', min: 0, max: 1, step: 0.01 })
    lk.addBinding(P.look.aluminium, 'anisotropy', { label: 'alu brushed', min: 0, max: 1, step: 0.01 })
    lk.addBinding(P.look.ceramic, 'color', { label: 'cer color' })
    lk.addBinding(P.look.ceramic, 'roughness', { label: 'cer rough', min: 0, max: 1, step: 0.01 })
    lk.addBinding(P.look.ceramic, 'clearcoat', { label: 'cer coat', min: 0, max: 1, step: 0.01 })
    lk.addBinding(P.look.ceramic, 'clearcoatRoughness', { label: 'cer coat rough', min: 0, max: 1, step: 0.01 })
    lk.addBinding(P.look, 'farResolution', { min: 0.15, max: 1, step: 0.05 })
    lk.addBinding(P.look, 'farDim', { min: 0, max: 1.5, step: 0.01 })
    lk.addBinding(P.look, 'farOpacity', { min: 0, max: 1, step: 0.01 })
    f.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify(P, null, 2)
      console.info(`[pieces] params:\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })
  }

  return {
    id: options.id ?? 'pieces',

    init(ctx) {
      renderer = ctx.renderer
      width = ctx.width
      height = ctx.height
      geometries = paths.map((d) => buildPieceGeometry(d, params.geometry))
      placements = layout(ctx.isMobile)
      projectAnchors(true)
      buildMeshes()
      // Mobile: no collisions (cost + touch already scrolls the page).
      sim = new PieceSimulation(
        placements.map((p) => p.body),
        params,
        !ctx.isMobile,
      )

      const pmrem = new PMREMGenerator(ctx.renderer)
      const room = new RoomEnvironment()
      envTarget = pmrem.fromScene(room, 0.04)
      room.dispose()
      pmrem.dispose()
      front.environment = envTarget.texture
      far.environment = envTarget.texture

      if (import.meta.dev) {
        const w = window as Window & { __piecesParams?: typeof params; __piecesDebug?: () => object }
        w.__piecesParams = params
        // Feel metrics for tests/console: displacement from anchors, speed, tightest same-layer gap.
        w.__piecesDebug = () => {
          const bodies = placements.map((p) => p.body)
          let maxOffset = 0
          let sumOffset = 0
          let maxSpeed = 0
          let minGap = Infinity
          for (const b of bodies) {
            const o = b.position.distanceTo(b.anchor)
            maxOffset = Math.max(maxOffset, o)
            sumOffset += o
            maxSpeed = Math.max(maxSpeed, b.velocity.length())
          }
          for (let i = 0; i < bodies.length; i++)
            for (let j = i + 1; j < bodies.length; j++) {
              const a = bodies[i]!
              const b = bodies[j]!
              if (a.layer !== b.layer) continue
              const ratio = a.position.distanceTo(b.position) / ((a.radius + b.radius) * params.physics.collisionScale)
              minGap = Math.min(minGap, ratio)
            }
          return { count: bodies.length, maxOffset, avgOffset: sumOffset / bodies.length, maxSpeed, minGapRatio: minGap, collisions: sim?.collisions }
        }
      }
      if (ctx.pane) buildPane(ctx.pane)
      syncLook()
      writeInstances()
    },

    update(_time, delta) {
      if (!sim) return
      updateField()
      if (reducedMotion.value) sim.rest()
      else sim.step(delta, field)
      syncLook()
      syncFarTarget()
      writeInstances()
    },

    render(r) {
      r.setRenderTarget(farTarget)
      r.clear()
      r.render(far, camera)
      r.setRenderTarget(null)
      r.render(farQuad, quadCamera)
      r.render(front, camera)
    },

    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      // Bodies glide to the re-projected anchors rather than jumping.
      projectAnchors(false)
      syncFarTarget()
    },

    setActive() {},

    dispose() {
      for (const { mesh } of meshes) mesh.dispose()
      geometries.forEach((g) => g.geometry.dispose())
      aluminium.dispose()
      ceramic.dispose()
      farMaterial.dispose()
      quadGeometry.dispose()
      farTarget.dispose()
      // The whole PMREM target, not just its texture (the texture alone leaves GPU resources behind).
      envTarget?.dispose()
      front.clear()
      far.clear()
      farQuad.clear()
      meshes = []
      geometries = []
      placements = []
      sim = null
      renderer = null
    },
  }
}
