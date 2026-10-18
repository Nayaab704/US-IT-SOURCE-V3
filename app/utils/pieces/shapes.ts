import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'

/**
 * PLACEHOLDER piece outlines (SVG path data, units ≈ px) until the logotype exists
 * (ART_DIRECTION §4, 1B [TBD]). Any set of path strings can be swapped in.
 */
export const PLACEHOLDER_PIECE_PATHS: readonly string[] = [
  'M0 0 h48 v120 h46 v34 h-94 z', // L
  'M0 -66 A66 66 0 0 1 66 0 h-32 A34 34 0 0 0 0 -34 z', // Arc
  'M0 0 h32 v140 h-32 z', // Bar
  'M0 0 h132 v32 h-132 z', // Top
  'M0 0 C42 0 72 22 72 54 h-32 C40 40 22 32 0 32 z', // S
  'M0 0 h32 v32 h-32 z', // Chip
  'M0 0 h34 l44 78 h-36 z', // Leg
  'M0 0 v38 a48 48 0 0 0 96 0 v-38 h-32 v38 a16 16 0 0 1 -32 0 v-38 z', // U
]

export interface PieceGeometryOptions {
  /** World units per SVG px. */
  unitsPerPx: number
  /** Extrusion depth as a fraction of the piece's largest dimension. */
  depth: number
  /** Bevel size as a fraction of the largest dimension — the edge that catches light. */
  bevel: number
}

export interface PieceGeometry {
  geometry: BufferGeometry
  /** Bounding-circle radius in the piece plane (world units, scale 1). */
  radius: number
}

const loader = new SVGLoader()

/** SVG path data → centred, thin, bevelled extrusion. Accepts multiple subpaths and holes. */
export function buildPieceGeometry(d: string, opts: PieceGeometryOptions): PieceGeometry {
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`)
  const shapes = data.paths.flatMap((p) => p.toShapes())
  if (shapes.length === 0) throw new Error(`[pieces] path produced no shapes: ${d}`)

  // Measure in px first so depth/bevel are proportional to each piece's own size.
  const probe = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false })
  probe.computeBoundingBox()
  const box = probe.boundingBox!
  const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  probe.dispose()

  const bevel = size * opts.bevel
  const geometry = new ExtrudeGeometry(shapes, {
    depth: Math.max(size * opts.depth - bevel * 2, size * 0.01),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel, // keep the outline's footprint: the bevel eats inward, not outward
    bevelSegments: 3,
    curveSegments: 24,
  })
  // SVG is y-down. Flipping y and z together is a 180° rotation, so winding (and normals) stay valid.
  geometry.scale(opts.unitsPerPx, -opts.unitsPerPx, -opts.unitsPerPx)
  geometry.center()
  geometry.computeBoundingBox()
  const b = geometry.boundingBox!
  const radius = Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y) / 2
  return { geometry, radius }
}
