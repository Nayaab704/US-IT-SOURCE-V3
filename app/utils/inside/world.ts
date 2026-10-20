import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Matrix4,
  Mesh,
  OctahedronGeometry,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  TetrahedronGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type IUniform,
  type WebGLRenderer,
} from 'three'
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js'
import { loadShader } from '~/utils/shaders'
import { insideParams as P } from './params'

/**
 * "Inside" (phase S3): a procedural monochrome world — misty dune floor, a distant light beam with
 * dust, thousands of crystal shards (with near-camera bokeh), the white line along the floor and up
 * the beam — and its own post chain (bloom, AgX, monochrome grade, grain, white-out to paper).
 * Renders on the shared renderer: into a target (seen through the frame) or straight to the screen.
 */
const u = <T>(value: T): IUniform<T> => ({ value })
const MEANDER = new Vector2(7, 3.5)
/** The beam's soft outer glow, relative to its core. */
const HALO = 0.035
const easeInOut2 = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeInOut3 = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** The path's meander: x of the line at depth z; straightens over the last 40 units to the beam. */
export function meanderX(z: number) {
  const taper = smooth(0, 40, z - P.beam.z)
  return (MEANDER.x * Math.sin(z * 0.021 + 0.6) + MEANDER.y * Math.sin(z * 0.047 + 1.9)) * taper
}

/**
 * The dunes, baked once on the CPU (the floor never moves): low-frequency fbm (3 octaves, rotated
 * between octaves like noise.glsl), flattened into a corridor along the path.
 */
function bakeDunes(geo: BufferGeometry) {
  const noise = new SimplexNoise({ random: rng(23) })
  const pos = geo.getAttribute('position')
  const A = P.floor.duneAmplitude
  const k = P.floor.duneScale
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    let px = x * k
    let py = z * k
    let pz = 0.37
    let sum = 0
    let amp = 0.5
    let norm = 0
    for (let o = 0; o < 3; o++) {
      sum += amp * noise.noise3d(px, py, pz)
      norm += amp
      const nx = (0 * px - 0.8 * py - 0.6 * pz) * 2.03
      const ny = (0.8 * px + 0.36 * py - 0.48 * pz) * 2.03
      const nz = (0.6 * px - 0.48 * py + 0.64 * pz) * 2.03
      px = nx
      py = ny
      pz = nz
      amp *= 0.5
    }
    pos.setY(i, (sum / norm) * A * smooth(5, 22, Math.abs(x - meanderX(z))))
  }
  geo.computeVertexNormals()
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class InsideWorld {
  readonly camera = new PerspectiveCamera(P.camera.fov, 1, 0.1, 1200)
  private readonly scene = new Scene()
  private readonly skyScene = new Scene()
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly quad: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly common = {
    uFogTop: u(new Color()),
    uFogHorizon: u(new Color()),
    uFogDensity: u(P.fog.density),
    uFogFalloff: u(P.fog.heightFalloff),
    uCamPos: u(new Vector3()),
  }
  private readonly time = u(0)
  private readonly beamBase = u(new Vector3(0, 0, P.beam.z))
  private readonly materials: ShaderMaterial[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly floorMat: ShaderMaterial
  private readonly beamCore: ShaderMaterial
  private readonly beamHalo: ShaderMaterial
  private readonly dustMat: ShaderMaterial
  private readonly shardMats: ShaderMaterial[] = []
  private readonly bokehMats: ShaderMaterial[] = []
  private readonly lineMat: ShaderMaterial
  private readonly skyMat: ShaderMaterial
  private readonly brightMat: ShaderMaterial
  private readonly blurMat: ShaderMaterial
  private readonly postMat: ShaderMaterial
  private readonly sceneRT = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: P.post.msaa, minFilter: LinearFilter, magFilter: LinearFilter })
  private readonly halfA = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false })
  private readonly halfB = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false })
  private lineGroundLength = 1
  private lineLength = 1
  private q = 0
  private still = false
  private look = new Vector2()
  private lookTarget = new Vector2()
  private frame = 0
  private w = 1
  private h = 1

  constructor(private readonly mobile: boolean) {
    const mat = (vert: string, frag: string, uniforms: Record<string, IUniform>, extra: Partial<ShaderMaterial> = {}) => {
      const m = new ShaderMaterial({ vertexShader: loadShader(vert), fragmentShader: loadShader(frag), uniforms: { ...this.common, ...uniforms } })
      Object.assign(m, extra)
      this.materials.push(m)
      return m
    }
    const geo = <G extends BufferGeometry>(g: G) => (this.geometries.push(g), g)

    // Sky (full-screen gradient, drawn first).
    this.skyMat = mat('fullscreen.vert', 'inside-sky.frag', { uInvViewProj: u(new Matrix4()) }, { depthTest: false, depthWrite: false })
    this.quad = new Mesh(geo(new PlaneGeometry(2, 2)), this.skyMat)
    this.quad.frustumCulled = false
    const sky = new Mesh(this.quad.geometry, this.skyMat)
    sky.frustumCulled = false
    this.skyScene.add(sky)

    // Floor.
    const segs = mobile ? P.floor.segmentsMobile : P.floor.segments
    const floorGeo = geo(new PlaneGeometry(P.floor.size, P.floor.size, segs, segs))
    floorGeo.rotateX(-Math.PI / 2)
    floorGeo.translate(0, 0, P.beam.z / 2)
    bakeDunes(floorGeo)
    this.floorMat = mat('inside-floor.vert', 'inside-floor.frag', {
      uBeamBase: this.beamBase,
      uBeamIntensity: u(P.beam.intensity),
      uPoolRadius: u(P.beam.poolRadius),
      uPool: u(P.beam.pool),
      uRoughness: u(P.floor.roughness),
      uStreak: u(mobile ? 0 : P.floor.streak),
      uGrain: u(P.floor.grain),
    })
    const floor = new Mesh(floorGeo, this.floorMat)
    floor.frustumCulled = false
    this.scene.add(floor)

    // Beam: a tight bright core and a wide soft halo (additive).
    const additive = { transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide } as Partial<ShaderMaterial>
    this.beamCore = mat('inside-beam.vert', 'inside-beam.frag', { uIntensity: u(P.beam.intensity), uFalloff: u(6), uTime: this.time }, additive)
    this.beamHalo = mat('inside-beam.vert', 'inside-beam.frag', { uIntensity: u(P.beam.intensity * HALO), uFalloff: u(3), uTime: this.time }, additive)
    const core = new Mesh(geo(new CylinderGeometry(1, 1, 1, 48, 1, true)), this.beamCore)
    const halo = new Mesh(core.geometry, this.beamHalo)
    for (const [m, r] of [
      [core, P.beam.radius],
      [halo, P.beam.radius * 2.6],
    ] as const) {
      m.scale.set(r, P.beam.height, r)
      m.position.set(0, P.beam.height / 2, P.beam.z)
      m.renderOrder = 3
      this.scene.add(m)
    }

    // Dust inside the beam.
    const r = rng(5)
    const dustGeo = geo(new BufferGeometry())
    const dn = P.beam.dust
    const dp = new Float32Array(dn * 3)
    const ds = new Float32Array(dn)
    for (let i = 0; i < dn; i++) {
      const a = r() * Math.PI * 2
      const rad = Math.sqrt(r()) * P.beam.radius * 1.6
      dp.set([Math.cos(a) * rad, r() * P.beam.height, P.beam.z + Math.sin(a) * rad], i * 3)
      ds[i] = r()
    }
    dustGeo.setAttribute('position', new Float32BufferAttribute(dp, 3))
    dustGeo.setAttribute('aSeed', new Float32BufferAttribute(ds, 1))
    this.dustMat = mat('inside-dust.vert', 'inside-dust.frag', { uTime: this.time, uHeight: u(P.beam.height), uPixelRatio: u(1), uIntensity: u(1.4) }, { transparent: true, depthWrite: false, blending: AdditiveBlending })
    const dust = new Points(dustGeo, this.dustMat)
    dust.frustumCulled = false
    dust.renderOrder = 4
    this.scene.add(dust)

    this.buildShards()
    this.lineMat = mat('inside-line.vert', 'inside-line.frag', { uHead: u(0), uGlow: u(P.line.glow) })
    this.buildLine()

    // Post.
    const pass = (frag: string, uniforms: Record<string, IUniform>) => mat('fullscreen.vert', frag, uniforms, { depthTest: false, depthWrite: false })
    this.brightMat = pass('inside-bright.frag', { tSource: u(null), uTexel: u(new Vector2()), uThreshold: u(P.post.bloomThreshold) })
    this.blurMat = pass('inside-blur.frag', { tSource: u(null), uDirection: u(new Vector2()) })
    this.postMat = pass('inside-post.frag', {
      tScene: u(null),
      tBloom: u(null),
      uBloomStrength: u(P.post.bloomStrength),
      uExposure: u(P.post.exposure),
      uVignette: u(P.post.vignette),
      uGrain: u(P.post.grain),
      uFrame: u(0),
      uWhite: u(0),
      uPaper: u(0),
      uPaperColor: u(new Vector3(241 / 255, 238 / 255, 231 / 255)),
    })
    this.quadScene.add(this.quad)
    this.setProgress(0)
  }

  /** Shards: octahedra + elongated tetrahedra (instanced), and their bokeh discs. */
  private buildShards() {
    const count = this.mobile ? P.shards.countMobile : P.shards.count
    const r = rng(17)
    const cloud = new Float32Array(count * 3)
    const slot = new Float32Array(count * 3)
    const spin = new Float32Array(count * 4)
    const meta = new Float32Array(count * 3)
    const S = P.shards
    const L = P.lattice
    // Lattice slots (relative to the beam base).
    const slots: number[][] = []
    if (L.shape === 1) {
      // Cuboctahedral (FCC) lattice points, nearest the centre first, scaled to the radius.
      const k = Math.ceil(Math.cbrt(count) * 0.9) + 2
      const pts: number[][] = []
      for (let x = -k; x <= k; x++) for (let y = -k; y <= k; y++) for (let z = -k; z <= k; z++) {
        if ((x + y + z) % 2 !== 0) continue
        if (Math.abs(x) + Math.abs(y) > k || Math.abs(y) + Math.abs(z) > k || Math.abs(x) + Math.abs(z) > k) continue
        pts.push([x, y, z])
      }
      pts.sort((a, b) => Math.hypot(a[0]!, a[1]!, a[2]!) - Math.hypot(b[0]!, b[1]!, b[2]!))
      const sc = L.radius / k
      for (let i = 0; i < count; i++) {
        const p = pts[i % pts.length]!
        slots.push([p[0]! * sc, L.baseY + L.height * 0.45 + p[1]! * sc * 1.4, p[2]! * sc])
      }
    } else {
      // Cylindrical grid: rings × spokes × levels.
      const rings = 3
      const spokes = 48
      const levels = Math.ceil(count / (rings * spokes))
      for (let i = 0; i < count; i++) {
        const ring = i % rings
        const spoke = Math.floor(i / rings) % spokes
        const level = Math.floor(i / (rings * spokes))
        const rad = L.radius * (0.55 + 0.225 * ring)
        const a = ((spoke + (level % 2) * 0.5) / spokes) * Math.PI * 2
        slots.push([Math.cos(a) * rad, L.baseY + (level / Math.max(1, levels - 1)) * L.height, Math.sin(a) * rad])
      }
    }
    for (let i = 0; i < count; i++) {
      // 55 % around and above the beam, 45 % along the corridor (they pass the camera: parallax).
      let x: number
      let y: number
      let z: number
      if (r() < 0.55) {
        const a = r() * Math.PI * 2
        const rad = 14 + Math.sqrt(r()) * S.cloudRadius
        x = Math.cos(a) * rad
        z = P.beam.z + Math.sin(a) * rad
        y = S.cloudHeight + (r() - 0.5) * 2 * S.cloudSpread
      } else {
        z = 6 + r() * (P.beam.z + 40 - 6)
        do x = meanderX(z) + (r() - 0.5) * 140
        while (Math.abs(x - meanderX(z)) < 5)
        y = 0.8 + r() ** 1.6 * 42
      }
      cloud.set([x, Math.max(0.6, y), z], i * 3)
      // Slot order: shards nearer the beam take the inner, lower slots (less crossing).
      slot.set(slots[i]!, i * 3)
      const ax = new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
      spin.set([ax.x, ax.y, ax.z, 0.2 + r() * 0.9], i * 4)
      const size = 1 + r() ** 3 * (S.sizeSpread - 1)
      const dist = Math.hypot(x, z - P.beam.z) / (S.cloudRadius + 160)
      meta.set([size, r(), clamp01(dist * 0.85 + r() * 0.15)], i * 3)
    }
    const nOcta = Math.round(count * 0.6)
    const parts: [number, number, BufferGeometry][] = [
      [0, nOcta, new OctahedronGeometry(1, 0)],
      [nOcta, count, new TetrahedronGeometry(1, 0).scale(0.7, 2.2, 0.7)],
    ]
    const sliceAttr = (arr: Float32Array, size: number, a: number, b: number) => new InstancedBufferAttribute(arr.slice(a * size, b * size), size)
    const shared = {
      uTime: this.time,
      uAssemble: u(0),
      uLatticeSpin: u(P.lattice.spin),
      uBeamBase: this.beamBase,
      uSize: u(P.shards.size),
      uBokehNear: u(P.shards.bokehNear),
    }
    for (const [a, b, base] of parts) {
      base.computeVertexNormals()
      const g = new InstancedBufferGeometry()
      g.index = base.index
      g.setAttribute('position', base.getAttribute('position'))
      g.setAttribute('normal', base.getAttribute('normal'))
      const attrs = { aCloud: sliceAttr(cloud, 3, a, b), aSlot: sliceAttr(slot, 3, a, b), aSpin: sliceAttr(spin, 4, a, b), aMeta: sliceAttr(meta, 3, a, b) }
      for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, v)
      g.instanceCount = b - a
      this.geometries.push(base, g)
      const sm = new ShaderMaterial({
        vertexShader: loadShader('inside-shard.vert'),
        fragmentShader: loadShader('inside-shard.frag'),
        uniforms: { ...this.common, ...shared, uGlint: u(P.shards.glint) },
      })
      this.materials.push(sm)
      this.shardMats.push(sm)
      const mesh = new Mesh(g, sm)
      mesh.frustumCulled = false
      mesh.renderOrder = 1
      this.scene.add(mesh)
      if (!this.mobile) {
        const quad = new PlaneGeometry(1, 1)
        const bg = new InstancedBufferGeometry()
        bg.index = quad.index
        bg.setAttribute('position', quad.getAttribute('position'))
        for (const [k, v] of Object.entries(attrs)) bg.setAttribute(k, v)
        bg.instanceCount = b - a
        this.geometries.push(quad, bg)
        const bm = new ShaderMaterial({
          vertexShader: loadShader('inside-bokeh.vert'),
          fragmentShader: loadShader('inside-bokeh.frag'),
          uniforms: { ...this.common, ...shared, uStrength: u(P.shards.bokeh) },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        })
        this.materials.push(bm)
        this.bokehMats.push(bm)
        const bmesh = new Mesh(bg, bm)
        bmesh.frustumCulled = false
        bmesh.renderOrder = 5
        this.scene.add(bmesh)
      }
    }
  }

  /** The line: along the path to the beam's base, then up the beam (revealed by arc length). */
  private buildLine() {
    const pts: Vector3[] = []
    for (let z = 10; z > P.beam.z + 1; z -= 6) pts.push(new Vector3(meanderX(z), P.line.radius * 0.6, z))
    pts.push(new Vector3(0, P.line.radius * 0.6, P.beam.z))
    pts.push(new Vector3(0, 6, P.beam.z))
    pts.push(new Vector3(0, P.beam.height * 0.6, P.beam.z))
    const curve = new CatmullRomCurve3(pts, false, 'centripetal')
    const segments = 900
    const g = new TubeGeometry(curve, segments, P.line.radius, 8, false)
    const arc = new Float32Array(g.getAttribute('position').count)
    const len = curve.getLength()
    for (let i = 0; i <= segments; i++) for (let j = 0; j <= 8; j++) arc[i * 9 + j] = (i / segments) * len
    g.setAttribute('aArc', new Float32BufferAttribute(arc, 1))
    this.geometries.push(g)
    const lengths = curve.getLengths((pts.length - 1) * 40)
    this.lineGroundLength = lengths[(pts.length - 3) * 40]!
    this.lineLength = len
    const mesh = new Mesh(g, this.lineMat)
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    this.scene.add(mesh)
  }

  setSize(w: number, h: number, stageDpr: number) {
    // Soft, fogged and grained: the world renders at most 1 px per CSS px (saves 2.25x at DPR 1.5).
    const dpr = Math.min(stageDpr, P.post.maxDpr)
    const W = Math.max(1, Math.round(w * dpr))
    const H = Math.max(1, Math.round(h * dpr))
    if (W === this.sceneRT.width && H === this.sceneRT.height) return
    this.w = w
    this.h = h
    this.sceneRT.setSize(W, H)
    this.halfA.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1))
    this.halfB.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1))
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.dustMat.uniforms.uPixelRatio!.value = dpr
  }

  /** Cursor look (−1…1 each axis). */
  setLook(x: number, y: number) {
    this.lookTarget.set(x, y)
  }

  /** Reduced motion: a single still frame (camera mid-way, lattice formed). */
  setStill(on: boolean) {
    this.still = on
  }

  /** World progress q (0–1): camera glide, assembly, the line rising, the light. */
  setProgress(q: number) {
    this.q = clamp01(q)
  }

  update(dt: number) {
    if (!this.still) this.time.value += dt
    const q = this.still ? 0.5 : this.q
    const C = P.camera
    // Camera z along the path: glide (ease in/out), slow approach, then into the beam.
    const zStart = 8
    const zGlideEnd = zStart + (P.beam.z + 55 - zStart) * C.glide / 0.82
    const zApproach = P.beam.z + 30
    let z: number
    let y = C.height
    if (q < 0.7) z = zStart + (zGlideEnd - zStart) * easeInOut2(q / 0.7)
    else if (q < 0.85) z = zGlideEnd + (zApproach - zGlideEnd) * ((q - 0.7) / 0.15)
    else {
      const t = easeInOut2((q - 0.85) / 0.15)
      z = zApproach + (P.beam.z + 2 - zApproach) * t
      y = C.height + 9 * t
    }
    const x = meanderX(z)
    const t = this.time.value
    // Sway (≤ 1° roll, ≤ 2° yaw) from slow incommensurate sines; cursor look ±2°, slowly lerped.
    const k = 1 - Math.exp(-dt * 1.6)
    this.look.lerp(this.lookTarget, this.still ? 1 : k)
    const deg = Math.PI / 180
    const yaw = (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.17 + 1.3) * 0.4) * C.swayYaw * deg - this.look.x * C.look * deg
    const roll = (Math.sin(t * 0.23 + 0.4) * 0.6 + Math.sin(t * 0.41) * 0.4) * C.swayRoll * deg
    const pitch = this.look.y * C.look * deg
    // Look ahead along the path, turning toward the beam as we close in.
    const ahead = new Vector3(meanderX(z - 40), y * 0.6, z - 40)
    const beamLook = new Vector3(0, 10 + (q > 0.85 ? 20 * (q - 0.85) / 0.15 : 0), P.beam.z)
    const toBeam = smooth(0.35, 0.8, q)
    const target = ahead.lerp(beamLook, toBeam)
    this.camera.position.set(x, y, z)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(target)
    this.camera.rotateY(yaw)
    this.camera.rotateX(pitch)
    this.camera.rotateZ(roll)
    this.camera.updateMatrixWorld()
    this.common.uCamPos.value.copy(this.camera.position)

    // Order from chaos (q 0.60–0.85); the line rises up the beam over the same span.
    const assemble = this.still ? 1 : easeInOut3(clamp01((q - 0.6) / 0.25))
    for (const m of [...this.shardMats, ...this.bokehMats]) m.uniforms.uAssemble!.value = assemble
    const rise = this.still ? 1 : clamp01((q - 0.6) / 0.25)
    this.lineMat.uniforms.uHead!.value = this.lineGroundLength + rise * (this.lineLength - this.lineGroundLength) + 1

    // Into the light: exposure up, bloom to white, settle to paper.
    const pm = this.postMat.uniforms
    pm.uExposure!.value = P.post.exposure * (1 + 2.5 * smooth(0.85, 0.97, q))
    pm.uWhite!.value = this.still ? 0 : smooth(0.88, 0.96, q)
    pm.uPaper!.value = this.still ? 0 : smooth(0.95, 1, q)
    this.syncParams()
  }

  private syncParams() {
    this.common.uFogTop.value.set(P.fog.top)
    this.common.uFogHorizon.value.set(P.fog.horizon)
    this.common.uFogDensity.value = P.fog.density
    this.common.uFogFalloff.value = P.fog.heightFalloff
    this.beamCore.uniforms.uIntensity!.value = P.beam.intensity
    this.beamHalo.uniforms.uIntensity!.value = P.beam.intensity * HALO
    this.floorMat.uniforms.uBeamIntensity!.value = P.beam.intensity
    for (const m of this.shardMats) {
      m.uniforms.uGlint!.value = P.shards.glint
      m.uniforms.uSize!.value = P.shards.size
      m.uniforms.uLatticeSpin!.value = P.lattice.spin
    }
    for (const m of this.bokehMats) {
      m.uniforms.uStrength!.value = P.shards.bokeh
      m.uniforms.uSize!.value = P.shards.size
    }
    this.lineMat.uniforms.uGlow!.value = P.line.glow
    const pm = this.postMat.uniforms
    pm.uBloomStrength!.value = this.mobile ? 0 : P.post.bloomStrength
    pm.uVignette!.value = P.post.vignette
    pm.uGrain!.value = P.post.grain
    this.brightMat.uniforms.uThreshold!.value = P.post.bloomThreshold
  }

  /** True once the white-out has settled into paper (the world need not draw any more). */
  get finished() {
    return !this.still && this.q >= 0.999
  }

  private pass(r: WebGLRenderer, m: ShaderMaterial, out: WebGLRenderTarget | null) {
    this.quad.material = m
    r.setRenderTarget(out)
    r.render(this.quadScene, this.quadCamera)
  }

  /**
   * Compile every program without blocking (KHR_parallel_shader_compile): each scene / pass for the
   * render target it really draws into (the target is part of a program's identity).
   */
  compileAsync(r: WebGLRenderer, finalTarget: WebGLRenderTarget | null): Promise<unknown> {
    const pass = (m: ShaderMaterial) => {
      const s = new Scene()
      const mesh = new Mesh(this.quad.geometry, m)
      mesh.frustumCulled = false
      s.add(mesh)
      return s
    }
    const prev = r.getRenderTarget()
    const jobs: Promise<unknown>[] = []
    r.setRenderTarget(this.sceneRT)
    jobs.push(r.compileAsync(this.skyScene, this.quadCamera), r.compileAsync(this.scene, this.camera))
    r.setRenderTarget(this.halfA)
    jobs.push(r.compileAsync(pass(this.brightMat), this.quadCamera), r.compileAsync(pass(this.blurMat), this.quadCamera))
    for (const t of [finalTarget, null]) {
      r.setRenderTarget(t)
      jobs.push(r.compileAsync(pass(this.postMat), this.quadCamera))
    }
    r.setRenderTarget(prev)
    return Promise.all(jobs)
  }

  /** Render the world through its post chain into `target` (null = the screen). */
  render(r: WebGLRenderer, target: WebGLRenderTarget | null) {
    this.frame++
    const inv = this.skyMat.uniforms.uInvViewProj!.value as Matrix4
    inv.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse).invert()
    const prevAutoClear = r.autoClear
    r.autoClear = false
    r.setRenderTarget(this.sceneRT)
    r.clear(true, true, false)
    r.render(this.skyScene, this.quadCamera)
    r.render(this.scene, this.camera)
    if (!this.mobile && P.post.bloomStrength > 0) {
      const bu = this.brightMat.uniforms
      bu.tSource!.value = this.sceneRT.texture
      ;(bu.uTexel!.value as Vector2).set(1 / this.sceneRT.width, 1 / this.sceneRT.height)
      this.pass(r, this.brightMat, this.halfA)
      const blur = this.blurMat.uniforms
      for (const spread of [1.2, 2.4]) {
        blur.tSource!.value = this.halfA.texture
        ;(blur.uDirection!.value as Vector2).set(spread / this.halfA.width, 0)
        this.pass(r, this.blurMat, this.halfB)
        blur.tSource!.value = this.halfB.texture
        ;(blur.uDirection!.value as Vector2).set(0, spread / this.halfA.height)
        this.pass(r, this.blurMat, this.halfA)
      }
    }
    const pm = this.postMat.uniforms
    pm.tScene!.value = this.sceneRT.texture
    pm.tBloom!.value = this.halfA.texture
    pm.uFrame!.value = this.frame
    this.pass(r, this.postMat, target)
    r.autoClear = prevAutoClear
  }

  dispose() {
    for (const m of this.materials) m.dispose()
    for (const g of this.geometries) g.dispose()
    this.sceneRT.dispose()
    this.halfA.dispose()
    this.halfB.dispose()
    this.scene.clear()
    this.skyScene.clear()
    this.quadScene.clear()
  }
}
