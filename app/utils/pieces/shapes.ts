import { ExtrudeGeometry, type BufferGeometry, type Shape } from 'three'

export interface PieceGeometryOptions {
  /** World units per SVG px. */
  unitsPerPx: number
  /** Extrusion depth as a fraction of `referenceSize`. */
  depth: number
  /** Bevel size as a fraction of `referenceSize` — the edge that catches light. */
  bevel: number
  /**
   * Size (px) that depth and bevel are proportional to. Defaults to the piece's own largest
   * dimension; a logotype passes its cap height so every fragment has the same thickness.
   */
  referenceSize?: number
}

export interface PieceGeometry {
  geometry: BufferGeometry
  /** Bounding-circle radius in the piece plane (world units, scale 1). */
  radius: number
  /** Centre of the piece's bounds in source SVG px (y down) — its slot in the source drawing. */
  centerPx: { x: number; y: number }
}

/** Shapes (from SVGLoader) → centred, thin, bevelled extrusion. Multiple shapes and holes are fine. */
export function buildPieceGeometry(shapes: Shape[], opts: PieceGeometryOptions): PieceGeometry {
  if (shapes.length === 0) throw new Error('[pieces] piece has no shapes')

  // Measure in px first so depth/bevel can be proportional and the slot centre is known.
  const probe = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false })
  probe.computeBoundingBox()
  const box = probe.boundingBox!
  const size = opts.referenceSize ?? Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  const centerPx = { x: (box.min.x + box.max.x) / 2, y: (box.min.y + box.max.y) / 2 }
  probe.dispose()

  const bevel = size * opts.bevel
  const geometry = new ExtrudeGeometry(shapes, {
    depth: Math.max(size * opts.depth - bevel * 2, size * 0.01),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel, // keep the outline's footprint: the bevel eats inward, not outward
    // Modest tessellation: arcs are small on screen and every pass pays for each vertex.
    bevelSegments: 2,
    curveSegments: 12,
  })
  // SVG is y-down. Flipping y and z together is a 180° rotation, so winding (and normals) stay valid.
  geometry.scale(opts.unitsPerPx, -opts.unitsPerPx, -opts.unitsPerPx)
  geometry.center()
  geometry.computeBoundingBox()
  const b = geometry.boundingBox!
  const radius = Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y) / 2
  return { geometry, radius, centerPx }
}
