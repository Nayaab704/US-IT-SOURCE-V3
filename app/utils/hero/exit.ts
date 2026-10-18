import type { Vector3 } from 'three'

/**
 * Hero exit — the camera pushes into the O and its counter becomes the aperture into the day
 * world (ART_DIRECTION §4 1B "Exit"). Exit progress e is 0–1 (scrubbed); p is the hero progress.
 * Shared by the pieces scene (camera, light, DOF), the day scene (mask) and the page (timeline).
 */
export const heroExitParams = {
  /** Daylight glimpse inside the counter during the hold (0–1 of full day). */
  hintIntensity: 0.25,
  /** p range over which the glimpse fades in once the logotype is assembled. */
  hintFrom: 0.74,
  hintFull: 0.84,
  /** Headline + services line pass behind glass over e 0 → this. */
  glassExitEnd: 0.15,
  /** Camera push window and its final distance to the counter, in counter radii. */
  pushStart: 0.1,
  pushEnd: 0.85,
  pushDistance: 1.6,
  /** Where power2.in hands over to power2.out (fraction of the push). */
  easeSplit: 0.5,
  /**
   * How the distance closes: 0 = constant zoom rate (log distance — fills the screen early),
   * 1 = linear distance (all growth at the very end). In between keeps the fill in the ease-out.
   */
  zoomCurve: 0.6,
  /** Day inside the counter rises from the hint to full by this e. */
  brightenEnd: 0.7,
  /** The circle expands from the counter to the whole viewport over this e range. */
  apertureStart: 0.7,
  apertureEnd: 0.9,
  /** Mask edge softness and the faint warm rim glow while it opens (CSS px). */
  feather: 3,
  rimBloom: 0.22,
  rimWidth: 16,
  /** Optional radial zoom blur on defocused pieces during the fastest part of the push. */
  zoomBlur: true,
  /** Sample spread at peak push speed (fraction of the screen; ≤ 0.03). */
  zoomBlurStrength: 0.012,
  /** Warm light at the counter that the O's inner bevels catch (peak intensity, range in counter radii). */
  lightIntensity: 6,
  lightRange: 3,
  /** Neighbouring letters soften with distance from the counter (in cap heights). */
  radialDofStart: 0.7,
  radialDofEnd: 2.5,
  /** Nav/DOM ink switches as the day covers this share of the screen. */
  inkFrom: 0.35,
  inkTo: 0.65,
  /** Day section copy rises in from this e. */
  textStart: 0.9,
  /** Mobile: no camera push — a circular wipe from the O over this e range. */
  mobileWipeStart: 0.05,
  mobileWipeEnd: 0.85,
}

export type HeroExitParams = typeof heroExitParams

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a || 1e-6))
  return t * t * (3 - 2 * t)
}
const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** power2.in up to k, power2.out after; position and velocity are continuous at k. */
export function splitEase(s: number, k: number) {
  const kk = Math.min(0.95, Math.max(0.05, k))
  if (s <= kk) return kk * (s / kk) ** 2
  return 1 - (1 - kk) * ((1 - s) / (1 - kk)) ** 2
}

export interface ExitCamera {
  /** 0–1 linear progress through the push window. */
  s: number
  /** Eased push progress. */
  f: number
  /** 0–1: how fast the push is moving right now (1 = fastest). */
  velocity: number
}

/** Camera-to-counter distance for eased push progress f (see zoomCurve). */
function pushDistanceAt(f: number, d0: number, d1: number) {
  const q = heroExitParams.zoomCurve
  if (q < 0.01) return d0 * Math.pow(d1 / d0, f)
  return Math.pow(Math.pow(d0, q) + (Math.pow(d1, q) - Math.pow(d0, q)) * f, 1 / q)
}

/** Apparent zoom speed (|d log distance / d e|) at e — for the zoom blur. */
function zoomSpeed(e: number, d0: number, d1: number) {
  const X = heroExitParams
  const h = 0.004
  const at = (x: number) => {
    const s = clamp01((x - X.pushStart) / (X.pushEnd - X.pushStart || 1e-6))
    return Math.log(pushDistanceAt(splitEase(s, X.easeSplit), d0, d1))
  }
  return Math.abs(at(e + h) - at(e - h)) / (2 * h)
}

/**
 * Camera position for exit progress e: a straight-on dolly toward the counter (orientation
 * never changes — no roll, no tilt). The sideways slide is tied to the distance so the counter's
 * screen offset shrinks steadily to zero: it drifts monotonically to the centre and lands there.
 */
export function exitCamera(e: number, counter: Vector3, radius: number, cameraHomeZ: number, out: Vector3): ExitCamera {
  const X = heroExitParams
  const s = clamp01((e - X.pushStart) / (X.pushEnd - X.pushStart || 1e-6))
  const f = splitEase(s, X.easeSplit)
  const d0 = cameraHomeZ - counter.z
  const d1 = Math.min(d0, radius * X.pushDistance)
  const d = pushDistanceAt(f, d0, d1)
  // Screen offset ∝ (counter − camera) / distance; this keeps it at (1 − f) × the initial offset.
  const k = 1 - ((1 - f) * d) / d0
  out.set(counter.x * k, counter.y * k, counter.z + d)
  let velocity = 0
  if (s > 0 && s < 1) {
    // Normalise by the peak zoom speed over the push (cheap: a few samples of pure maths).
    let peak = 1e-6
    for (let i = 1; i < 24; i++) peak = Math.max(peak, zoomSpeed(X.pushStart + ((X.pushEnd - X.pushStart) * i) / 24, d0, d1))
    velocity = Math.min(1, zoomSpeed(e, d0, d1) / peak)
  }
  return { s, f, velocity }
}

export interface ScreenCircle {
  /** Centre in CSS px from the top-left, radius in CSS px. */
  x: number
  y: number
  r: number
}

export interface Aperture extends ScreenCircle {
  /** Day opacity inside the circle (0–1). */
  intensity: number
  feather: number
  bloom: number
  bloomWidth: number
  /** Share of the viewport covered (0–1). */
  coverage: number
}

/** Share of a w × h viewport inside a circle — sampled on a grid (cheap, plenty accurate here). */
export function circleCoverage(c: ScreenCircle, w: number, h: number) {
  const corners = Math.max(Math.hypot(c.x, c.y), Math.hypot(w - c.x, c.y), Math.hypot(c.x, h - c.y), Math.hypot(w - c.x, h - c.y))
  if (c.r >= corners) return 1
  if (c.r <= 0) return 0
  const nx = 32
  const ny = 18
  let inside = 0
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const x = ((i + 0.5) / nx) * w
      const y = ((j + 0.5) / ny) * h
      if ((x - c.x) ** 2 + (y - c.y) ** 2 <= c.r * c.r) inside++
    }
  return inside / (nx * ny)
}

/**
 * The day region for hero progress p and exit progress e, given the counter's current screen
 * circle. Null when nothing of the day is visible (no render cost).
 */
export function apertureState(p: number, e: number, counter: ScreenCircle, w: number, h: number, isMobile: boolean): Aperture | null {
  const X = heroExitParams
  const hint = X.hintIntensity * smoothstep(X.hintFrom, X.hintFull, p)
  const base = { x: counter.x, y: counter.y, feather: X.feather, bloomWidth: X.rimWidth }
  if (e <= 0) {
    if (hint < 0.001) return null
    return { ...base, r: counter.r, intensity: hint, bloom: 0, coverage: circleCoverage(counter, w, h) }
  }
  // Farthest viewport corner (+ the feather) = the radius that covers everything.
  const cover = Math.max(Math.hypot(counter.x, counter.y), Math.hypot(w - counter.x, counter.y), Math.hypot(counter.x, h - counter.y), Math.hypot(w - counter.x, h - counter.y)) + X.feather + 2
  let r: number
  let intensity: number
  let bloom = 0
  if (isMobile) {
    const wipe = power2InOut(clamp01((e - X.mobileWipeStart) / (X.mobileWipeEnd - X.mobileWipeStart || 1e-6)))
    r = counter.r + Math.max(0, cover - counter.r) * wipe
    intensity = X.hintIntensity + (1 - X.hintIntensity) * smoothstep(X.mobileWipeStart, X.mobileWipeStart + 0.35, e)
  } else {
    const a = clamp01((e - X.apertureStart) / (X.apertureEnd - X.apertureStart || 1e-6))
    // Never smaller than the counter: while the O is on screen its inner edge is the boundary.
    r = counter.r + Math.max(0, cover - counter.r) * power2InOut(a)
    intensity = X.hintIntensity + (1 - X.hintIntensity) * smoothstep(X.pushStart, X.brightenEnd, e)
    bloom = X.rimBloom * Math.sin(Math.PI * a)
  }
  const circle = { x: counter.x, y: counter.y, r }
  return { ...base, r, intensity, bloom, coverage: circleCoverage(circle, w, h) }
}

/** World during the exit: ink follows coverage (switch at ~50%); night stops only at 100%. */
export function exitWorld(coverage: number) {
  const X = heroExitParams
  return { ink: smoothstep(X.inkFrom, X.inkTo, coverage), render: coverage >= 0.999 ? 1 : 0 }
}
