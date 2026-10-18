import { Vector3 } from 'three'

/**
 * Scroll assembly maths (ART_DIRECTION §4 1B). Pure functions of the hero progress p,
 * so the whole sequence is scrubbed and fully reversible.
 */
export interface AssemblyParams {
  start: number
  end: number
  /** Share of the assembly range used to stagger piece start times. */
  stagger: number
  /** Last fraction of each piece's own travel in which its rotation resolves to 0. */
  rotateTail: number
  /** Sideways bend of the travel path, as a fraction of the travel distance. */
  bend: number
  /** Bow toward the camera mid-travel, as a fraction of the travel distance. */
  bulge: number
}

export interface PieceTiming {
  /** 0 → 1 over the piece's own window (linear). */
  u: number
  /** u eased with power3.inOut — drives position and scale. */
  travel: number
  /** 0 → 1 over the last `rotateTail` of the travel — rotation resolves to the slot. */
  settle: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Same curve as GSAP's power3.inOut. */
export function power3InOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Smootherstep: zero velocity and acceleration at both ends — the "click" into the slot. */
function smootherstep(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** `order` ∈ [0, 1]: 0 starts first, 1 last (far pieces are given high orders). */
export function pieceTiming(p: number, order: number, a: AssemblyParams, out: PieceTiming): PieceTiming {
  const range = a.end - a.start
  const spread = a.stagger * range
  const duration = Math.max(range - spread, 1e-4)
  const t0 = a.start + spread * order
  out.u = clamp01((p - t0) / duration)
  out.travel = power3InOut(out.u)
  out.settle = smootherstep(clamp01((out.u - (1 - a.rotateTail)) / Math.max(a.rotateTail, 1e-4)))
  return out
}

const _ctrl = new Vector3()
const _d = new Vector3()

/** Quadratic Bézier from `from` to `to`, bent sideways (perpendicular in the screen plane) and toward camera. */
export function curvedPath(out: Vector3, from: Vector3, to: Vector3, t: number, bendSign: number, a: AssemblyParams) {
  _d.subVectors(to, from)
  const dist = _d.length()
  // Perpendicular in the xy plane; falls back to "up" for purely depth-wise travel.
  const px = -_d.y
  const py = _d.x
  const pl = Math.hypot(px, py) || 1
  _ctrl
    .addVectors(from, to)
    .multiplyScalar(0.5)
    .add(_d.set((px / pl) * a.bend * dist * bendSign, (py / pl) * a.bend * dist * bendSign, a.bulge * dist))
  const s = 1 - t
  return out.set(
    s * s * from.x + 2 * s * t * _ctrl.x + t * t * to.x,
    s * s * from.y + 2 * s * t * _ctrl.y + t * t * to.y,
    s * s * from.z + 2 * s * t * _ctrl.z + t * t * to.z,
  )
}
