import type { Shape } from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'

/**
 * Generic logotype loader. Contract (so the logotype can be swapped without code changes):
 * - every `<path>` with an id is ONE piece (document order);
 * - every other element with an id (except `<svg>` / `<g>`) is a MARKER — a named point for
 *   later scenes (e.g. `#o-counter`, the O's aperture). Circles keep centre + radius.
 */
export interface LogotypePiece {
  id: string
  shapes: Shape[]
}

export interface LogotypeMarker {
  id: string
  /** Centre in SVG px (y down). */
  x: number
  y: number
  /** Radius in SVG px (circles; otherwise half the bbox diagonal). */
  radius: number
}

export interface Logotype {
  pieces: LogotypePiece[]
  markers: Map<string, LogotypeMarker>
  /** Union bounds of all pieces in SVG px. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
}

const loader = new SVGLoader()

function num(el: Element, attr: string) {
  return Number.parseFloat(el.getAttribute(attr) ?? '0')
}

export function parseLogotype(svgText: string): Logotype {
  const data = loader.parse(svgText)
  const pieces: LogotypePiece[] = []
  for (const path of data.paths) {
    // SVGLoader converts circles/rects to paths as well — only real <path> elements are pieces.
    const node = path.userData?.node as Element | undefined
    if (!node || node.tagName.toLowerCase() !== 'path' || !node.id) continue
    pieces.push({ id: node.id, shapes: path.toShapes() })
  }
  if (pieces.length === 0) throw new Error('[logotype] no <path id="…"> pieces found')

  const markers = new Map<string, LogotypeMarker>()
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  for (const el of doc.querySelectorAll('[id]')) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'svg' || tag === 'g' || tag === 'path') continue
    if (tag === 'circle') {
      markers.set(el.id, { id: el.id, x: num(el, 'cx'), y: num(el, 'cy'), radius: num(el, 'r') })
    } else if (tag === 'ellipse') {
      markers.set(el.id, { id: el.id, x: num(el, 'cx'), y: num(el, 'cy'), radius: Math.max(num(el, 'rx'), num(el, 'ry')) })
    } else if (tag === 'rect') {
      const w = num(el, 'width')
      const h = num(el, 'height')
      markers.set(el.id, { id: el.id, x: num(el, 'x') + w / 2, y: num(el, 'y') + h / 2, radius: Math.hypot(w, h) / 2 })
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pieces)
    for (const s of p.shapes)
      for (const pt of s.getPoints(8)) {
        minX = Math.min(minX, pt.x)
        minY = Math.min(minY, pt.y)
        maxX = Math.max(maxX, pt.x)
        maxY = Math.max(maxY, pt.y)
      }

  return { pieces, markers, bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } }
}
