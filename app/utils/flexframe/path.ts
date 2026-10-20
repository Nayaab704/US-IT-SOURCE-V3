import { CatmullRomCurve3, Vector3 } from 'three'
import type { PathPoint, SnakeKey } from './params'

/** A card in section pixels (x, y = top-left). */
export interface PxRect {
  x: number
  y: number
  w: number
  h: number
}

export interface LinePath {
  curve: CatmullRomCurve3
  /** Arc length (px) at each control point, and in total. */
  controlArc: number[]
  length: number
  /** Arc length where the path first enters the screen (x crosses 0). */
  enterArc: number
}

const SAMPLES_PER_SEGMENT = 48

/**
 * Control points → a Catmull-Rom curve in SECTION pixels (x right, y down, z = depth in px).
 * 'view' points are fractions of the section; 'card' points are in card widths from its centre.
 */
export function buildLinePath(points: readonly PathPoint[], w: number, h: number, card: PxRect, loopScale: number): LinePath {
  const cx = card.x + card.w / 2
  const cy = card.y + card.h / 2
  const pts = points.map((p) =>
    p.space === 'card'
      ? new Vector3(cx + p.x * card.w * loopScale, cy + p.y * card.w * loopScale, p.z)
      : new Vector3(p.x * w, p.y * h, p.z),
  )
  const curve = new CatmullRomCurve3(pts, false, 'centripetal')
  const n = pts.length
  const lengths = curve.getLengths((n - 1) * SAMPLES_PER_SEGMENT)
  const controlArc = pts.map((_, i) => lengths[i * SAMPLES_PER_SEGMENT]!)
  const length = lengths[lengths.length - 1]!
  // First sample on screen.
  let enterArc = 0
  const tmp = new Vector3()
  for (let i = 0; i <= 400; i++) {
    curve.getPointAt(i / 400, tmp)
    if (tmp.x >= 0) {
      enterArc = (i / 400) * length
      break
    }
  }
  return { curve, controlArc, length, enterArc }
}

/** Arc length for a keyframe: k < 0 → screen entry; k ≥ last → past the end; else control point k. */
export function keyArc(path: LinePath, key: SnakeKey, vw: number, endPad: number) {
  const n = path.controlArc.length
  if (key.k < 0) return path.enterArc + key.px * vw
  if (key.k >= n - 1) return path.length + endPad + key.px * vw
  const i = Math.floor(key.k)
  const f = key.k - i
  return path.controlArc[i]! + (path.controlArc[i + 1]! - path.controlArc[i]!) * f + key.px * vw
}

/** Piecewise-linear arc position along keyframes at progress p (linear: the snake never stalls at a key). */
export function snakeArc(path: LinePath, keys: readonly SnakeKey[], p: number, vw: number, endPad: number) {
  if (p <= keys[0]!.p) return keyArc(path, keys[0]!, vw, endPad)
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!
    const b = keys[i + 1]!
    if (p <= b.p) {
      const t = (p - a.p) / Math.max(b.p - a.p, 1e-6)
      return keyArc(path, a, vw, endPad) + (keyArc(path, b, vw, endPad) - keyArc(path, a, vw, endPad)) * t
    }
  }
  return keyArc(path, keys[keys.length - 1]!, vw, endPad)
}
