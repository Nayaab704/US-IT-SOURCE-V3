import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector2, Vector3 } from 'three'
import { WORKFLOW_PATH } from '~/components/scenes/problems/workflowPath'
import type { RibbonParams } from './params'

export interface RibbonGeometry {
  geometry: BufferGeometry
  curve: CatmullRomCurve3
  /** World thickness (wave amplitude is a fraction of it). */
  thickness: number
  /** World length of the centre line and of the cross-section's perimeter: the wave grid's extent. */
  length: number
  perimeter: number
  /** Sampled centre line (framing, clearance check). */
  centre: Vector3[]
  /** Where the workflow path itself starts and ends along the curve (the rest is tail), 0–1. */
  inner: [number, number]
}

export interface RibbonDetail {
  /** Segments along the workflow path, along each tail, and around the cross-section. */
  segments: number
  tailSegments: number
  ringSegments: number
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Bold and simple: resample the workflow path to a few control points by arc length, then smooth
 * them — only big sweeping arcs survive, small wiggles don't.
 */
export function simplifyPath(points: readonly { x: number; y: number }[], count: number, passes: number) {
  const src = points.map((p) => new Vector2(p.x, p.y))
  const cum = [0]
  for (let i = 1; i < src.length; i++) cum.push(cum[i - 1]! + src[i]!.distanceTo(src[i - 1]!))
  const total = cum[cum.length - 1]!
  const out: Vector2[] = []
  let k = 0
  for (let i = 0; i < count; i++) {
    const d = (total * i) / (count - 1)
    while (k < src.length - 2 && cum[k + 1]! < d) k++
    const t = (d - cum[k]!) / Math.max(cum[k + 1]! - cum[k]!, 1e-9)
    out.push(src[k]!.clone().lerp(src[k + 1]!, Math.min(1, t)))
  }
  for (let p = 0; p < passes; p++) {
    const prev = out.map((v) => v.clone())
    for (let i = 1; i < out.length - 1; i++) out[i]!.copy(prev[i - 1]!).multiplyScalar(0.25).addScaledVector(prev[i]!, 0.5).addScaledVector(prev[i + 1]!, 0.25)
  }
  return out
}

/**
 * The simplified path as a smooth 3D curve lying on a horizontal plane like a studio object
 * (path x/y → world x/−z); the over/under weave is the height, so the loop passes over itself.
 */
export function ribbonCurve(g: RibbonParams['geometry']) {
  const pts = simplifyPath(WORKFLOW_PATH, Math.max(4, Math.round(g.controlPoints)), Math.round(g.smoothing))
  const n = pts.length
  const points = pts.map((p, i) => {
    const u = i / (n - 1)
    const lift = g.depth * g.scale * Math.sin(u * Math.PI * g.depthWaves + g.depthPhase)
    return new Vector3((p.x - 0.5) * g.scale, lift, -(p.y - 0.5) * g.scale)
  })
  // Long straight-ish tails: the cut ends stay far outside any framing, even as the ribbon turns.
  const tail = g.tail * g.scale
  const head = points[0]!.clone().sub(points[1]!).setY(0).normalize()
  const end = points[n - 1]!.clone().sub(points[n - 2]!).setY(0).normalize()
  points.unshift(points[0]!.clone().addScaledVector(head, tail))
  points.push(points[points.length - 1]!.clone().addScaledVector(end, tail))
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  // Arc-length position of the first and last real control point (control point i sits at t = i / (count − 1)).
  const K = 32
  const lengths = curve.getLengths((points.length - 1) * K)
  const total = lengths[lengths.length - 1]!
  const inner: [number, number] = [lengths[K]! / total, lengths[(points.length - 2) * K]! / total]
  return { curve, inner }
}

/**
 * The cushion cross-section: a superellipse (|x/a|^n + |y/b|^n = 1) whose faces then swell by an
 * inflation bulge, so it reads as air-filled — convex faces, fully rounded edges, no bevel lines.
 * Resampled by arc length (even spacing all round, v = perimeter fraction) with normals from the
 * finely sampled profile tangent → smooth everywhere. Counter-clockwise, starting at the right edge.
 */
export function cushionSection(width: number, thickness: number, n: number, bulge: number, segments: number) {
  const a = width / 2
  const b = thickness / 2
  const e = 2 / Math.max(n, 1.01)
  const F = 2048
  const fine: { x: number; y: number }[] = []
  for (let i = 0; i < F; i++) {
    const th = (i / F) * Math.PI * 2
    const c = Math.cos(th)
    const sn = Math.sin(th)
    const x = a * Math.sign(c) * Math.abs(c) ** e
    const y = b * Math.sign(sn) * Math.abs(sn) ** e * (1 + bulge * (1 - (x / a) ** 2))
    fine.push({ x, y })
  }
  const cum = [0]
  for (let i = 1; i <= F; i++) cum.push(cum[i - 1]! + Math.hypot(fine[i % F]!.x - fine[i - 1]!.x, fine[i % F]!.y - fine[i - 1]!.y))
  const perimeter = cum[F]!
  const ring: { x: number; y: number; nx: number; ny: number; v: number }[] = []
  let k = 0
  for (let j = 0; j <= segments; j++) {
    const d = (perimeter * j) / segments
    while (k < F - 1 && cum[k + 1]! < d) k++
    const t = (d - cum[k]!) / Math.max(cum[k + 1]! - cum[k]!, 1e-12)
    const p0 = fine[k]!
    const p1 = fine[(k + 1) % F]!
    const x = p0.x + (p1.x - p0.x) * t
    const y = p0.y + (p1.y - p0.y) * t
    // Tangent from the neighbours on the fine profile; outward normal = tangent rotated −90°.
    const pa = fine[(k - 1 + F) % F]!
    const pb = fine[(k + 2) % F]!
    const tx = pb.x - pa.x
    const ty = pb.y - pa.y
    const tl = Math.hypot(tx, ty) || 1
    ring.push({ x, y, nx: ty / tl, ny: -tx / tl, v: j / segments })
  }
  // Seam vertex: exactly the first point (v = 1).
  ring[segments] = { ...ring[0]!, v: 1 }
  return { ring, perimeter }
}

/**
 * The cushion swept along the curve.
 * Frames: rotation-minimising (double reflection, Wang et al. 2008) → no random twist; the
 * intentional twists are added on top. Sampling is denser on the workflow path than on the tails.
 * UV: u = arc length along the whole curve (0–1), v around the perimeter by length (seam vertex),
 * so the wave grid is isotropic and wraps cleanly; coarse and fine builds share the same UV space.
 * Extra attributes for the shader: aBinormal (thickness direction, for deflation thinning) and
 * aSection (local x, y, profile normal — where on the cushion a vertex sits).
 */
export function buildRibbonGeometry(g: RibbonParams['geometry'], detail: RibbonDetail): RibbonGeometry {
  const { curve, inner } = ribbonCurve(g)
  const width = g.width
  const thickness = width / g.widthToThickness
  const { ring, perimeter } = cushionSection(width, thickness, g.superellipse, g.bulge, Math.max(8, Math.round(detail.ringSegments)))
  const M = ring.length

  // Arc-length samples: tails get few segments, the workflow path gets the rest.
  const us: number[] = []
  const nt = Math.max(2, Math.round(detail.tailSegments))
  const ni = Math.max(8, Math.round(detail.segments))
  for (let i = 0; i < nt; i++) us.push((inner[0] * i) / nt)
  for (let i = 0; i < ni; i++) us.push(inner[0] + ((inner[1] - inner[0]) * i) / ni)
  for (let i = 0; i <= nt; i++) us.push(inner[1] + ((1 - inner[1]) * i) / nt)
  const N = us.length - 1
  const P: Vector3[] = []
  const T: Vector3[] = []
  for (const u of us) {
    P.push(curve.getPointAt(u))
    T.push(curve.getTangentAt(u).normalize())
  }
  const R: Vector3[] = []
  // Start with the width horizontal and the thickness vertical: the ribbon lies flat, top face up.
  const up = Math.abs(T[0]!.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
  R.push(new Vector3().crossVectors(T[0]!, up).normalize())
  const v1 = new Vector3()
  const rL = new Vector3()
  const tL = new Vector3()
  const v2 = new Vector3()
  for (let i = 0; i < N; i++) {
    v1.subVectors(P[i + 1]!, P[i]!)
    const c1 = v1.dot(v1) || 1e-12
    rL.copy(R[i]!).addScaledVector(v1, (-2 / c1) * v1.dot(R[i]!))
    tL.copy(T[i]!).addScaledVector(v1, (-2 / c1) * v1.dot(T[i]!))
    v2.subVectors(T[i + 1]!, tL)
    const c2 = v2.dot(v2) || 1e-12
    R.push(rL.clone().addScaledVector(v2, (-2 / c2) * v2.dot(rL)).normalize())
  }

  const vertexCount = (N + 1) * M + 2 * (M + 1)
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const binormals = new Float32Array(vertexCount * 3)
  const sections = new Float32Array(vertexCount * 4)
  const nrm = new Vector3()
  const bin = new Vector3()
  const frameN: Vector3[] = []
  const frameB: Vector3[] = []
  let vi = 0
  for (let i = 0; i <= N; i++) {
    const u = us[i]!
    // Intentional slow twists (positions along the workflow path): extra roll that eases in and stays.
    const wu = (u - inner[0]) / (inner[1] - inner[0])
    let roll = 0
    for (const tw of g.twists) roll += tw.amount * smoothstep(tw.u - tw.span, tw.u + tw.span, wu)
    nrm.copy(R[i]!).applyAxisAngle(T[i]!, roll)
    bin.crossVectors(T[i]!, nrm).normalize()
    frameN.push(nrm.clone())
    frameB.push(bin.clone())
    for (let j = 0; j < M; j++) {
      const c = ring[j]!
      positions[vi * 3] = P[i]!.x + nrm.x * c.x + bin.x * c.y
      positions[vi * 3 + 1] = P[i]!.y + nrm.y * c.x + bin.y * c.y
      positions[vi * 3 + 2] = P[i]!.z + nrm.z * c.x + bin.z * c.y
      normals[vi * 3] = nrm.x * c.nx + bin.x * c.ny
      normals[vi * 3 + 1] = nrm.y * c.nx + bin.y * c.ny
      normals[vi * 3 + 2] = nrm.z * c.nx + bin.z * c.ny
      binormals.set([bin.x, bin.y, bin.z], vi * 3)
      sections.set([c.x, c.y, c.nx, c.ny], vi * 4)
      uvs[vi * 2] = u
      uvs[vi * 2 + 1] = c.v
      vi++
    }
  }

  const indices: number[] = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M - 1; j++) {
      const a0 = i * M + j
      const a1 = i * M + j + 1
      const b0 = (i + 1) * M + j
      const b1 = (i + 1) * M + j + 1
      // Ring runs counter-clockwise around the tangent → this order faces outward.
      indices.push(a0, a1, b0, a1, b1, b0)
    }
  }

  // End caps (flat, facing along ∓ the tangent); the seam vertex is skipped.
  for (const [i, sign] of [
    [0, -1],
    [N, 1],
  ] as const) {
    const centre = vi
    const t = T[i]!
    const bb = frameB[i]!
    positions.set([P[i]!.x, P[i]!.y, P[i]!.z], vi * 3)
    normals.set([t.x * sign, t.y * sign, t.z * sign], vi * 3)
    binormals.set([bb.x, bb.y, bb.z], vi * 3)
    uvs.set([us[i]!, 0.5], vi * 2)
    vi++
    const first = vi
    for (let j = 0; j < M; j++) {
      const c = ring[j]!
      const n = frameN[i]!
      positions.set([P[i]!.x + n.x * c.x + bb.x * c.y, P[i]!.y + n.y * c.x + bb.y * c.y, P[i]!.z + n.z * c.x + bb.z * c.y], vi * 3)
      normals.set([t.x * sign, t.y * sign, t.z * sign], vi * 3)
      binormals.set([bb.x, bb.y, bb.z], vi * 3)
      sections.set([c.x, c.y, 0, 0], vi * 4)
      uvs.set([us[i]!, c.v], vi * 2)
      vi++
    }
    for (let j = 0; j < M - 1; j++) {
      const p0 = first + j
      const p1 = first + j + 1
      if (sign > 0) indices.push(centre, p0, p1)
      else indices.push(centre, p1, p0)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aBinormal', new Float32BufferAttribute(binormals, 3))
  geometry.setAttribute('aSection', new Float32BufferAttribute(sections, 4))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  // The bulge makes the cushion thicker than its nominal thickness at the middle.
  return { geometry, curve, thickness: thickness * (1 + g.bulge), length: curve.getLength(), perimeter, centre: P, inner }
}

/**
 * Smallest gap between two parts of the ribbon that are far apart along the path (dev check: the
 * loop must pass over itself, not through itself). Measured centre to centre minus the thickness.
 */
export function selfClearance(rg: RibbonGeometry, width: number) {
  const c = rg.centre
  const step = Math.max(1, Math.floor(c.length / 300))
  const minSep = Math.ceil((width * 2) / (rg.length / c.length))
  let best = Infinity
  for (let i = 0; i < c.length; i += step) {
    for (let j = i + minSep; j < c.length; j += step) {
      const dx = c[i]!.x - c[j]!.x
      const dz = c[i]!.z - c[j]!.z
      // Only parts that overlap in plan view can collide; their height difference must clear.
      if (Math.hypot(dx, dz) < width) best = Math.min(best, Math.abs(c[i]!.y - c[j]!.y) - rg.thickness)
    }
  }
  return best
}
