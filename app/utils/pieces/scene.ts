import {
  BatchedMesh,
  Color,
  DirectionalLight,
  Euler,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  AdditiveBlending,
  NormalBlending,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type BufferGeometry,
  type WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { FolderApi } from 'tweakpane'
import logotypeSvg from '~/assets/logo/logotype-fragments.svg?raw'
import type { StageScene } from '~/composables/useStage'
import { loadShader } from '~/utils/shaders'
import { curvedPath, pieceTiming, type PieceTiming } from './assembly'
import { parseLogotype, type Logotype } from './logotype'
import { piecesParams as params, type PiecesParams } from './params'
import { PieceSimulation, type Body, type PointerField } from './physics'
import { buildPieceGeometry } from './shapes'

export interface KeyLightSource {
  /** Viewport UV of the atmosphere's key light (may be off-screen) and its colour. */
  x: number
  y: number
  color: string
}

export interface PiecesSceneOptions {
  id?: string
  /** Logotype SVG markup (every `<path id>` is a piece). Defaults to the interim logotype. */
  svg?: string
  /** Live link to the atmosphere's key light, so pieces and fog share one light source. */
  keyLight?: () => KeyLightSource
}

export interface PiecesScene extends StageScene {
  readonly params: PiecesParams
  /** Logotype height / width — lets HTML lay out relative to the assembled logotype. */
  readonly logotypeRatio: number
  /** Hero progress p (0–1): 0–0.12 free play, then assembly, sweep, hold (ART_DIRECTION §4 1B). */
  setAssembly(p: number): void
  /** A named marker from the SVG (e.g. 'o-counter') in world space at the assembled position. */
  getMarker(id: string): { center: Vector3; radius: number } | null
}

const FOV = 30
const CAMERA_Z = 20
const TAN_HALF = Math.tan(((FOV / 2) * Math.PI) / 180)
const IDENTITY = new Quaternion()

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

interface Piece {
  id: string
  body: Body
  /** Floating anchor in viewport fractions (0–1, origin bottom-left) — re-projected on resize. */
  u: number
  v: number
  /** Floating size relative to the assembled size. */
  factor: number
  /** Geometry bounding radius at scale 1 (1 unit = logotype cap height). */
  geometryRadius: number
  /** Slot offset from the logotype centre, SVG px (y down). */
  slotX: number
  slotY: number
  /** 0 = starts assembling first, 1 = last (far pieces). */
  order: number
  bendSign: number
  batch: BatchedMesh
  instance: number
  home: Vector3
  timing: PieceTiming
  hover: number
  // Rendered transform (sim blended with assembly) — what the GPU and the raycaster see.
  pos: Vector3
  quat: Quaternion
  scale: number
  coc: number
}

export function createPiecesScene(options: PiecesSceneOptions = {}): PiecesScene {
  const reducedMotion = useReducedMotion()
  const pointer = usePointer()
  const logotype: Logotype = parseLogotype(options.svg ?? logotypeSvg)
  const capPx = logotype.bounds.height
  const logoCx = (logotype.bounds.minX + logotype.bounds.maxX) / 2
  const logoCy = (logotype.bounds.minY + logotype.bounds.maxY) / 2

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  camera.position.set(0, 0, CAMERA_Z)
  const scene = new Scene()

  const aluminium = new MeshPhysicalMaterial({ metalness: 1 })
  const ceramic = new MeshPhysicalMaterial({ metalness: 0 })
  const key = new DirectionalLight()
  scene.add(key, key.target)

  // Depth of field: sharp pieces go straight to the (antialiased) canvas; a soft low-res pass + CoC from
  // real depth are blended over them only where something is out of focus (see pieces-composite.frag).
  // No full-res offscreen target: clearing/resolving one costs ~3 ms of bandwidth on integrated GPUs.
  const rtOpts = { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter } as const
  // MSAA on the soft pass: bevel highlights are sub-pixel at this size and would alias into dotted lines.
  const blurTarget = new WebGLRenderTarget(1, 1, { ...rtOpts, samples: 4 })
  const cocTarget = new WebGLRenderTarget(1, 1, rtOpts)
  const cocMaterial = new ShaderMaterial({
    vertexShader: loadShader('pieces-coc.vert'),
    fragmentShader: loadShader('pieces-coc.frag'),
    uniforms: {
      uFocusDistance: { value: CAMERA_Z },
      uDofStart: { value: params.dof.start },
      uDofEnd: { value: params.dof.end },
    },
  })
  // Seam sweep: additive band drawn over the visible piece surfaces (depth-tested, no depth write).
  const sweepMaterial = new ShaderMaterial({
    vertexShader: loadShader('pieces-sweep.vert'),
    fragmentShader: loadShader('pieces-sweep.frag'),
    uniforms: {
      uX: { value: 0 },
      uWidth: { value: params.sweep.width },
      uIntensity: { value: 0 },
      uFaces: { value: params.sweep.faces },
      uColor: { value: new Color(params.sweep.color) },
    },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const quadGeometry = new PlaneGeometry(2, 2)
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const compositeMaterial = new ShaderMaterial({
    vertexShader: loadShader('fullscreen.vert'),
    fragmentShader: loadShader('pieces-composite.frag'),
    uniforms: {
      uBlur: { value: blurTarget.texture },
      uBlurSize: { value: new Vector2(1, 1) },
      uCoc: { value: cocTarget.texture },
      uCocSize: { value: new Vector2(1, 1) },
      uExposure: { value: 1 },
      uFarDim: { value: params.look.farDim },
      uFarOpacity: { value: params.look.farOpacity },
    },
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthTest: false,
    depthWrite: false,
  })
  const compositeScene = new Scene()
  compositeScene.add(new Mesh(quadGeometry, compositeMaterial))

  let renderer: WebGLRenderer | null = null
  let envTarget: WebGLRenderTarget | null = null
  let batches: BatchedMesh[] = []
  let pieces: Piece[] = []
  const byInstance = new Map<string, Piece>()
  let sim: PieceSimulation | null = null
  let isMobile = false
  let width = 1
  let height = 1
  let progress = 0
  let useBlur = true
  let sweepActive = false
  /** World size of the logotype cap height when assembled. */
  let homeCap = 1
  let homeCenterY = 0
  let hovered: Piece | null = null

  const field: PointerField = {
    active: false,
    positions: [new Vector3(), new Vector3(), new Vector3()],
    velocities: [new Vector3(), new Vector3(), new Vector3()],
    speedNdc: 0,
  }
  const layerZ = () => [params.layout.nearZ, params.layout.midZ, params.layout.farZ] as const
  const halfHeightAt = (z: number) => (CAMERA_Z - z) * TAN_HALF

  /** Jittered-grid anchors for one layer, all outside the copy-exclusion zone. */
  function layerAnchors(n: number, rand: () => number) {
    const L = params.layout
    const excluded = (u: number, v: number) => u < L.excludeX && v < L.excludeY
    let cols = Math.max(1, Math.round(Math.sqrt(n * 1.6)))
    let cells: { u: number; v: number; cw: number; ch: number }[] = []
    // Grow the grid until enough cells sit outside the exclusion zone.
    for (;;) {
      const rows = Math.max(1, Math.ceil(n / cols))
      cells = []
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const u = 0.06 + ((c + 0.5) / cols) * 0.88
          const v = 0.08 + ((r + 0.5) / rows) * 0.84
          if (!excluded(u, v)) cells.push({ u, v, cw: 0.88 / cols, ch: 0.84 / rows })
        }
      if (cells.length >= n) break
      cols++
    }
    cells.sort(() => rand() - 0.5)
    return cells.slice(0, n).map((cell) => {
      const u = cell.u + (rand() - 0.5) * 0.8 * cell.cw
      const v = cell.v + (rand() - 0.5) * 0.8 * cell.ch
      return excluded(u, v) ? { u: cell.u, v: cell.v } : { u, v }
    })
  }

  function build() {
    const L = params.layout
    const rand = mulberry32(L.seed)
    const n = logotype.pieces.length
    const nNear = Math.round(n * L.nearShare)
    const nMid = Math.round(n * L.midShare)
    // Seeded shuffle → layer assignment, so neighbouring letters don't all float in one layer.
    const shuffled = logotype.pieces.map((_, i) => i).sort(() => rand() - 0.5)
    const layerOf = new Array<0 | 1 | 2>(n)
    shuffled.forEach((pieceIndex, k) => (layerOf[pieceIndex] = k < nNear ? 0 : k < nNear + nMid ? 1 : 2))
    const anchors = [0, 1, 2].map((layer) => layerAnchors(layerOf.filter((l) => l === layer).length, rand))
    const anchorCursor = [0, 0, 0]
    const scales = [L.nearScale, L.midScale, L.farScale]

    const geometries: { geometry: BufferGeometry; ceramic: boolean }[] = []
    const drafts = logotype.pieces.map((lp, i) => {
      const g = buildPieceGeometry(lp.shapes, {
        unitsPerPx: 1 / capPx, // 1 unit = cap height; the assembled size is applied as instance scale
        depth: params.geometry.depth,
        bevel: params.geometry.bevel,
        referenceSize: capPx, // same thickness for every fragment
      })
      const ceramic = rand() < L.ceramicShare
      geometries.push({ geometry: g.geometry, ceramic })
      const layer = layerOf[i]!
      const anchor = anchors[layer]![anchorCursor[layer]!++]!
      const anchorRotation = new Quaternion().setFromEuler(
        new Euler(L.tilt * (rand() * 2 - 1), L.tilt * (rand() * 2 - 1), rand() * Math.PI * 2),
      )
      const seeds = Array.from({ length: 6 }, (_, k) => (k < 3 ? 0.6 + rand() * 0.8 : rand() * Math.PI * 2))
      return {
        id: lp.id,
        layer,
        anchor,
        anchorRotation,
        seeds: seeds as Body['seeds'],
        factor: scales[layer]! * (1 + L.scaleJitter * (rand() * 2 - 1)),
        geometryRadius: g.radius,
        slotX: g.centerPx.x - logoCx,
        slotY: g.centerPx.y - logoCy,
        // Far pieces start later; jitter within each layer's third.
        order: (layer + rand() * 0.9) / 3,
        bendSign: rand() < 0.5 ? -1 : 1,
        ceramic,
      }
    })

    // One BatchedMesh per material: 2 draw calls per pass for all pieces.
    const makeBatch = (isCeramic: boolean) => {
      const list = geometries.filter((g) => g.ceramic === isCeramic)
      const vertices = list.reduce((s, g) => s + g.geometry.getAttribute('position').count, 0)
      const batch = new BatchedMesh(Math.max(list.length, 1), Math.max(vertices, 3), undefined, isCeramic ? ceramic : aluminium)
      // Both rebuild + re-upload the draw list on every render call (×3 passes). Pieces are opaque,
      // few and nearly always on screen, so neither pays for itself here.
      batch.sortObjects = false
      batch.perObjectFrustumCulled = false
      batch.frustumCulled = false
      scene.add(batch)
      return batch
    }
    const ceramicBatch = makeBatch(true)
    const aluminiumBatch = makeBatch(false)
    batches = [aluminiumBatch, ceramicBatch]

    pieces = drafts.map((d, i) => {
      const batch = d.ceramic ? ceramicBatch : aluminiumBatch
      const instance = batch.addInstance(batch.addGeometry(geometries[i]!.geometry))
      const body: Body = {
        layer: d.layer,
        position: new Vector3(),
        velocity: new Vector3(),
        rotation: d.anchorRotation.clone(),
        angular: new Vector3(),
        anchor: new Vector3(),
        anchorRotation: d.anchorRotation,
        scale: 1,
        radius: 1,
        mass: 1,
        inertia: 1,
        influence: 1,
        seeds: d.seeds,
      }
      const piece: Piece = {
        id: d.id,
        body,
        u: d.anchor.u,
        v: d.anchor.v,
        factor: d.factor,
        geometryRadius: d.geometryRadius,
        slotX: d.slotX,
        slotY: d.slotY,
        order: d.order,
        bendSign: d.bendSign,
        batch,
        instance,
        home: new Vector3(),
        timing: { u: 0, travel: 0, settle: 0 },
        hover: 0,
        pos: new Vector3(),
        quat: new Quaternion(),
        scale: 1,
        coc: 0,
      }
      byInstance.set(`${batch.id}:${instance}`, piece)
      return piece
    })
    // The batches keep their own copies of the vertex data.
    geometries.forEach((g) => g.geometry.dispose())
  }

  /** Floating anchors, home slots and sizes all derive from the viewport — recomputed on resize. */
  function layout(snap: boolean) {
    const A = params.assembly
    const aspect = width / height
    const hh = halfHeightAt(A.homeZ)
    const logoWidth = (isMobile ? A.widthMobile : A.widthDesktop) * 2 * hh * aspect
    homeCap = (logoWidth * capPx) / logotype.bounds.width
    homeCenterY = (1 - 2 * A.centerFromTop) * hh
    const zs = layerZ()
    for (const p of pieces) {
      const b = p.body
      p.home.set((p.slotX / capPx) * homeCap, homeCenterY - (p.slotY / capPx) * homeCap, A.homeZ)
      const z = zs[b.layer]
      const lh = halfHeightAt(z)
      b.anchor.set((p.u * 2 - 1) * lh * aspect, (p.v * 2 - 1) * lh, z)
      if (snap) b.position.copy(b.anchor)
      b.scale = homeCap * p.factor
      b.radius = p.geometryRadius * b.scale
      b.mass = Math.max(b.radius * b.radius, 0.05)
      b.inertia = 0.4 * b.mass * b.radius * b.radius
    }
  }

  const _axis = new Vector3()
  const _tilt = new Quaternion()
  const _m = new Matrix4()
  const _s = new Vector3()
  const _keyDir = new Vector3()

  /** Blend each piece's live sim transform with its assembly path; write the GPU matrices. */
  function composePieces() {
    const A = params.assembly
    const D = params.dof
    _keyDir.copy(key.position).normalize()
    // Tilting about this axis turns a piece's face toward the key light.
    _axis.set(0, 0, 1).cross(_keyDir).normalize()
    let maxCoc = 0
    for (const p of pieces) {
      const b = p.body
      const t = pieceTiming(progress, p.order, A, p.timing)
      b.influence = 1 - t.travel
      if (t.travel <= 0) {
        p.pos.copy(b.position)
        p.quat.copy(b.rotation)
        p.scale = b.scale
      } else if (t.travel >= 1) {
        p.pos.copy(p.home)
        p.quat.identity()
        p.scale = homeCap
      } else {
        curvedPath(p.pos, b.position, p.home, t.travel, p.bendSign, A)
        p.quat.slerpQuaternions(b.rotation, IDENTITY, t.settle)
        p.scale = b.scale + (homeCap - b.scale) * t.travel
      }
      if (p.hover > 1e-4) {
        p.pos.z += p.hover * params.hover.lift
        p.quat.premultiply(_tilt.setFromAxisAngle(_axis, p.hover * params.hover.tilt))
      }
      const behind = A.homeZ - p.pos.z
      const x = Math.min(1, Math.max(0, (behind - D.start) / Math.max(D.end - D.start, 1e-4)))
      p.coc = x * x * (3 - 2 * x)
      maxCoc = Math.max(maxCoc, p.coc)
      p.batch.setMatrixAt(p.instance, _m.compose(p.pos, p.quat, _s.setScalar(p.scale)))
    }
    // Everything in focus (the hold) → skip the soft and CoC passes entirely.
    useBlur = maxCoc > 0.002
  }

  // A piece whose CoC is ~1 is replaced entirely by its soft copy; one at ~0 never uses it.
  const SHARP_MAX_COC = 0.995
  const BLUR_MIN_COC = 0.005
  function setPassVisibility(pass: 'sharp' | 'blur' | 'all') {
    for (const p of pieces) {
      const visible = pass === 'all' || (pass === 'sharp' ? p.coc < SHARP_MAX_COC : p.coc > BLUR_MIN_COC)
      // setVisibleAt marks the draw list dirty, so only touch it when the value really changes.
      if (p.batch.getVisibleAt(p.instance) !== visible) p.batch.setVisibleAt(p.instance, visible)
    }
  }

  const raycaster = new Raycaster()
  const _ndc = new Vector2()
  function updateHover(delta: number) {
    const H = params.hover
    const live = !isMobile && !reducedMotion.value && progress >= H.from && pointer.inside
    hovered = null
    if (live) {
      _ndc.set(pointer.x, pointer.y)
      raycaster.setFromCamera(_ndc, camera)
      const hit = raycaster.intersectObjects(batches, false)[0]
      if (hit && hit.batchId !== undefined) hovered = byInstance.get(`${hit.object.id}:${hit.batchId}`) ?? null
    }
    const k = 1 - Math.pow(1 - H.ease, delta * 60)
    for (const p of pieces) p.hover += ((p === hovered ? 1 : 0) - p.hover) * k
  }

  function updateSweep() {
    const S = params.sweep
    const t = (progress - S.start) / Math.max(S.end - S.start, 1e-4)
    if (isMobile || reducedMotion.value || t <= 0 || t >= 1) {
      sweepActive = false
      return
    }
    // Travels a little beyond both ends of the logotype so it enters and leaves cleanly.
    const half = ((logotype.bounds.width / capPx) * homeCap) / 2 + homeCap
    const u = sweepMaterial.uniforms
    u.uX!.value = -half + 2 * half * t
    u.uWidth!.value = S.width
    u.uFaces!.value = S.faces
    u.uIntensity!.value = S.intensity * Math.sin(Math.PI * t)
    ;(u.uColor!.value as Color).set(S.color)
    sweepActive = true
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

  const _c = new Color()
  function syncLook() {
    const k = options.keyLight?.()
    const aspect = width / height
    // Same direction as the atmosphere's key light: its screen position, pushed toward the viewer.
    const kx = k ? (k.x - 0.5) * 2 * aspect : 1
    const ky = k ? (k.y - 0.5) * 2 : 1
    key.position.set(kx * 10, ky * 10, 12)
    key.color.set(k?.color ?? '#ffffff')
    key.intensity = params.look.keyIntensity
    const L = params.look
    aluminium.color.set(_c.set(L.aluminium.color))
    aluminium.roughness = L.aluminium.roughness
    aluminium.anisotropy = L.aluminium.anisotropy
    ceramic.color.set(_c.set(L.ceramic.color))
    ceramic.roughness = L.ceramic.roughness
    ceramic.clearcoat = L.ceramic.clearcoat
    ceramic.clearcoatRoughness = L.ceramic.clearcoatRoughness
    scene.environmentIntensity = L.envIntensity
    const cu = cocMaterial.uniforms
    cu.uFocusDistance!.value = CAMERA_Z - params.assembly.homeZ
    cu.uDofStart!.value = params.dof.start
    cu.uDofEnd!.value = params.dof.end
    const u = compositeMaterial.uniforms
    u.uFarDim!.value = L.farDim
    u.uFarOpacity!.value = L.farOpacity
    u.uExposure!.value = renderer?.toneMappingExposure ?? 1
  }

  function syncTargets() {
    if (!renderer) return
    const dpr = renderer.getPixelRatio()
    const size = (t: WebGLRenderTarget, s: number, uniform?: Vector2) => {
      const w = Math.max(1, Math.round(width * s))
      const h = Math.max(1, Math.round(height * s))
      if (w !== t.width || h !== t.height) t.setSize(w, h)
      uniform?.set(w, h)
    }
    const u = compositeMaterial.uniforms
    size(blurTarget, dpr * params.look.farResolution, u.uBlurSize!.value as Vector2)
    size(cocTarget, dpr * params.look.farResolution, u.uCocSize!.value as Vector2)
  }

  function getMarker(id: string) {
    const m = logotype.markers.get(id)
    if (!m) return null
    return {
      center: new Vector3(((m.x - logoCx) / capPx) * homeCap, homeCenterY - ((m.y - logoCy) / capPx) * homeCap, params.assembly.homeZ),
      radius: (m.radius / capPx) * homeCap,
    }
  }

  function buildPane(f: FolderApi) {
    const P = params
    const pv = f.addFolder({ title: 'Preview p (dev)', expanded: false })
    pv.addBinding(P.debug, 'overrideP', { label: 'override scroll' })
    pv.addBinding(P.debug, 'p', { min: 0, max: 1, step: 0.001 })
    const as = f.addFolder({ title: 'Assembly', expanded: false })
    as.addBinding(P.assembly, 'start', { min: 0, max: 1, step: 0.005 })
    as.addBinding(P.assembly, 'end', { min: 0, max: 1, step: 0.005 })
    as.addBinding(P.assembly, 'stagger', { min: 0, max: 0.9, step: 0.01 })
    as.addBinding(P.assembly, 'rotateTail', { min: 0.05, max: 1, step: 0.01 })
    as.addBinding(P.assembly, 'bend', { min: 0, max: 1.5, step: 0.01 })
    as.addBinding(P.assembly, 'bulge', { min: 0, max: 1, step: 0.01 })
    const relayout = () => layout(false)
    as.addBinding(P.assembly, 'widthDesktop', { min: 0.3, max: 1, step: 0.01 }).on('change', relayout)
    as.addBinding(P.assembly, 'widthMobile', { min: 0.3, max: 1, step: 0.01 }).on('change', relayout)
    as.addBinding(P.assembly, 'centerFromTop', { min: 0.1, max: 0.9, step: 0.005 }).on('change', relayout)
    const sw = f.addFolder({ title: 'Seam sweep', expanded: false })
    sw.addBinding(P.sweep, 'start', { min: 0, max: 1, step: 0.005 })
    sw.addBinding(P.sweep, 'end', { min: 0, max: 1, step: 0.005 })
    sw.addBinding(P.sweep, 'intensity', { min: 0, max: 3, step: 0.01 })
    sw.addBinding(P.sweep, 'width', { min: 0.05, max: 2, step: 0.01 })
    sw.addBinding(P.sweep, 'faces', { min: 0, max: 1, step: 0.01 })
    sw.addBinding(P.sweep, 'color')
    const hv = f.addFolder({ title: 'Hover (assembled)', expanded: false })
    hv.addBinding(P.hover, 'from', { min: 0, max: 1, step: 0.005 })
    hv.addBinding(P.hover, 'lift', { min: 0, max: 4, step: 0.05 })
    hv.addBinding(P.hover, 'tilt', { min: 0, max: 0.6, step: 0.005 })
    hv.addBinding(P.hover, 'ease', { min: 0.01, max: 1, step: 0.01 })
    const dof = f.addFolder({ title: 'Depth of field', expanded: false })
    dof.addBinding(P.dof, 'start', { min: 0, max: 15, step: 0.1 })
    dof.addBinding(P.dof, 'end', { min: 0.5, max: 20, step: 0.1 })
    dof.addBinding(P.look, 'farResolution', { label: 'blur resolution', min: 0.15, max: 1, step: 0.05 })
    dof.addBinding(P.look, 'farDim', { label: 'out-of-focus dim', min: 0, max: 1.5, step: 0.01 })
    dof.addBinding(P.look, 'farOpacity', { label: 'out-of-focus opacity', min: 0, max: 1, step: 0.01 })
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
    f.addButton({ title: 'Copy params as JSON' }).on('click', () => {
      const json = JSON.stringify(P, null, 2)
      console.info(`[pieces] params:\n${json}`)
      void navigator.clipboard?.writeText(json).catch(() => {})
    })
  }

  function exposeDebug() {
    const w = window as Window & { __piecesParams?: typeof params; __piecesDebug?: () => object }
    w.__piecesParams = params
    // Feel + assembly metrics for tests and the console.
    w.__piecesDebug = () => {
      const bodies = pieces.map((p) => p.body)
      let maxOffset = 0
      let sumOffset = 0
      let maxSpeed = 0
      let minGap = Infinity
      let maxHomeError = 0
      let maxAngle = 0
      for (const p of pieces) {
        const b = p.body
        const o = b.position.distanceTo(b.anchor)
        maxOffset = Math.max(maxOffset, o)
        sumOffset += o
        maxSpeed = Math.max(maxSpeed, b.velocity.length())
        maxHomeError = Math.max(maxHomeError, p.pos.distanceTo(p.home))
        maxAngle = Math.max(maxAngle, 2 * Math.acos(Math.min(1, Math.abs(p.quat.w))))
      }
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i]!
          const b = bodies[j]!
          if (a.layer !== b.layer) continue
          minGap = Math.min(minGap, a.position.distanceTo(b.position) / ((a.radius + b.radius) * params.physics.collisionScale))
        }
      // Where the O's aperture lands on screen (for the later exit transition).
      const o = getMarker('o-counter')
      const oScreen = o ? o.center.clone().project(camera) : null
      return {
        count: pieces.length,
        p: progress,
        maxOffset,
        avgOffset: sumOffset / pieces.length,
        maxSpeed,
        minGapRatio: minGap,
        collisions: sim?.collisions,
        maxHomeError,
        maxAngleDeg: (maxAngle * 180) / Math.PI,
        hovered: hovered?.id ?? null,
        hoverLift: hovered ? hovered.hover * params.hover.lift : 0,
        useBlur,
        sweepIntensity: sweepActive ? (sweepMaterial.uniforms.uIntensity!.value as number) : 0,
        oCounterPx: oScreen ? { x: ((oScreen.x + 1) / 2) * width, y: ((1 - oScreen.y) / 2) * height, radius: o!.radius } : null,
        homeCap,
      }
    }
  }

  return {
    id: options.id ?? 'pieces',
    params,
    logotypeRatio: logotype.bounds.height / logotype.bounds.width,

    setAssembly(p) {
      progress = Math.min(1, Math.max(0, p))
    },

    getMarker,

    init(ctx) {
      renderer = ctx.renderer
      width = ctx.width
      height = ctx.height
      isMobile = ctx.isMobile
      build()
      layout(true)
      // Mobile: no collisions (cost + touch already scrolls the page).
      sim = new PieceSimulation(
        pieces.map((p) => p.body),
        params,
        !ctx.isMobile,
      )

      const pmrem = new PMREMGenerator(ctx.renderer)
      const room = new RoomEnvironment()
      envTarget = pmrem.fromScene(room, 0.04)
      room.dispose()
      pmrem.dispose()
      scene.environment = envTarget.texture

      if (import.meta.dev) exposeDebug()
      if (ctx.pane) buildPane(ctx.pane)
      syncLook()
      composePieces()
    },

    update(_time, delta) {
      if (!sim) return
      if (import.meta.dev && params.debug.overrideP) progress = params.debug.p
      updateField()
      if (reducedMotion.value) sim.rest()
      else sim.step(delta, field)
      updateHover(delta)
      composePieces()
      updateSweep()
      syncLook()
      syncTargets()
    },

    render(r) {
      // Each piece is drawn only where it can show: fully defocused pieces skip the sharp pass,
      // in-focus pieces skip the soft pass. The CoC pass draws all of them (it resolves occlusion).
      // Sharp pass straight onto the canvas, over the atmosphere (three applies the same ACES + sRGB).
      setPassVisibility('sharp')
      r.setRenderTarget(null)
      r.render(scene, camera)
      if (sweepActive) {
        scene.overrideMaterial = sweepMaterial
        r.render(scene, camera)
        scene.overrideMaterial = null
      }
      if (!useBlur) return
      setPassVisibility('blur')
      r.setRenderTarget(blurTarget)
      r.clear()
      r.render(scene, camera)
      setPassVisibility('all')
      scene.overrideMaterial = cocMaterial
      r.setRenderTarget(cocTarget)
      r.clear()
      r.render(scene, camera)
      scene.overrideMaterial = null
      r.setRenderTarget(null)
      r.render(compositeScene, quadCamera)
    },

    resize(w, h) {
      width = Math.max(1, w)
      height = Math.max(1, h)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      // Bodies glide to the re-projected anchors; assembled slots snap with the layout.
      layout(false)
      syncTargets()
    },

    setActive() {},

    dispose() {
      for (const b of batches) b.dispose()
      aluminium.dispose()
      ceramic.dispose()
      cocMaterial.dispose()
      sweepMaterial.dispose()
      compositeMaterial.dispose()
      quadGeometry.dispose()
      blurTarget.dispose()
      cocTarget.dispose()
      // The whole PMREM target, not just its texture (the texture alone leaves GPU resources behind).
      envTarget?.dispose()
      scene.clear()
      compositeScene.clear()
      batches = []
      pieces = []
      byInstance.clear()
      sim = null
      renderer = null
    },
  }
}
