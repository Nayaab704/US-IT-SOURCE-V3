/**
 * "Sunlight through leaves" (F3): dappled light drifting over the contact section. The stage canvas
 * sits above the page with mix-blend-mode: multiply, so this is LIGHT on everything below — white is
 * neutral, the leaf shadows multiply the page slightly darker and cooler, the sun gaps slightly warmer.
 */
export const leavesParams = {
  /** Internal resolution of the pattern pass (soft, so it upscales invisibly). */
  internalScale: 0.5,
  internalScaleMobile: 0.33,
  /** Full leaf shadow (a multiplier: about 11% darker, a touch cool) and how much of it shows (0–1). */
  shadowTint: '#e1e3dc',
  shadow: 1,
  /** Sun gaps: warm tint (multiplier on the warm-white page) and its strength (0–1). */
  lightTint: '#fff4de',
  light: 0.45,
  /** Leaf-cluster size (bigger = larger shapes) and the threshold (more = more leaf). */
  scale: 0.62,
  coverage: 0.56,
  /** Penumbra softness (near layer, far layer). */
  penumbra: 0.055,
  penumbraFar: 0.13,
  /** Sway: amplitude (screen heights) and periods (s) — gentle, ≥ 6 s. */
  sway: 0.012,
  swayPeriod: 7.4,
  swayPeriod2: 11.3,
  /** Slow drift of the whole pattern across the section (screen heights per second). */
  drift: 0.004,
  grain: 0.012,
}

export type LeavesParams = typeof leavesParams
