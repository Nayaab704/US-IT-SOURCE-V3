/**
 * /about — the night line's background: a few large lacquer shapes (the ribbon's material and
 * studio light) drifting very slowly, rendered small and upsampled so they read as soft, out-of-focus
 * forms behind the giant sentence. Wired to Tweakpane "about-sheen" in dev.
 */
export const sheenParams = {
  /** Render resolution (fraction of the canvas): low = softer. */
  internalScale: 0.22,
  internalScaleMobile: 0.18,
  /** How strongly the shapes show over the void (0–1). */
  strength: 0.85,
  exposure: 1.2,
  /** Drift: seconds per cycle (slow), amplitude (world units). */
  driftPeriod: 70,
  drift: 0.6,
  /** Studio rotation (rad/s): moves the reflections across the shapes. */
  envRotation: 0.012,
  /** Scroll parallax: how far the shapes move across the pinned scroll (world units). */
  parallax: 1.2,
  grain: 0.012,
}
