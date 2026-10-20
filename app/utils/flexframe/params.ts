/**
 * "The line & the flexible frame" (phase S1) → "Inside" (S3): the day section after the hero.
 * Positions are fractions of the (pinned, viewport-sized) section unless marked `card`, in which
 * case they are in card widths from the card's centre (y down) — so the loop follows the card.
 * Timings are fractions of the pinned scroll progress p (0–1).
 */
export interface PathPoint {
  x: number
  y: number
  /** Depth in px: < 0 behind the card (z = 0), > 0 in front of it. */
  z: number
  space: 'view' | 'card'
}

/** A snake keyframe: at progress p the end sits at control point `k` (fractional index) + `px`. */
export interface SnakeKey {
  p: number
  k: number
  px: number
}

/**
 * A point on the loop round the card: a ring seen in perspective — wide (r card widths) and flattened
 * vertically (LOOP_ASPECT), so its top stretch crosses the card's upper half (behind it, z < 0) and
 * its bottom stretch the lower half (in front, z > 0).
 */
const LOOP_ASPECT = 0.4
const loop = (deg: number, r: number, z: number): PathPoint => ({
  x: -0.06 + r * Math.cos((deg * Math.PI) / 180),
  y: -r * LOOP_ASPECT * Math.sin((deg * Math.PI) / 180),
  z,
  space: 'card',
})

export const flexParams = {
  line: {
    color: '#3b5bff',
    /** Tube radius (px at 1440 wide; scales with the viewport width). */
    radius: 8,
    /** Visible length of the snake, × viewport width. */
    visibleLength: 1.6,
    /** Loop size multiplier (scales the card-relative points about the card). */
    loopScale: 1,
    /** Soft key light (matte): how much the lit side brightens. */
    shade: 0.28,
    /**
     * Desktop path (≈ 17 Catmull-Rom points): in above the headline → through it (between its
     * lines) → down to the card → ≈ 1.1 turns round it (behind on top, in front below) → S-wave out.
     */
    points: [
      { x: -0.08, y: 0.14, z: 0, space: 'view' },
      { x: 0.2, y: 0.12, z: 0, space: 'view' },
      { x: 0.52, y: 0.13, z: 0, space: 'view' },
      { x: 0.68, y: 0.2, z: 0, space: 'view' },
      { x: 0.6, y: 0.284, z: 0, space: 'view' },
      { x: 0.42, y: 0.29, z: 0, space: 'view' },
      { x: 0.3, y: 0.36, z: 0, space: 'view' },
      loop(60, 0.66, -34),
      loop(0, 0.62, 0),
      loop(-60, 0.62, 34),
      loop(-120, 0.62, 34),
      loop(-180, 0.62, 0),
      loop(-240, 0.64, -34),
      loop(-300, 0.7, -30),
      loop(-336, 0.74, 10),
      { x: 0.44, y: 0.66, z: 12, space: 'view' },
      { x: 0.56, y: 0.86, z: 0, space: 'view' },
      { x: 0.72, y: 0.66, z: 0, space: 'view' },
      { x: 0.88, y: 0.9, z: 0, space: 'view' },
      { x: 1.1, y: 0.78, z: 0, space: 'view' },
    ] as PathPoint[],
    /** Mobile: in from the left, one loop round the card, out to the right. */
    pointsMobile: [
      { x: -0.15, y: 0.36, z: 0, space: 'view' },
      { x: 0.3, y: 0.38, z: 0, space: 'view' },
      { x: 0.5, y: 0.42, z: 0, space: 'view' },
      loop(70, 0.62, -30),
      loop(0, 0.6, 0),
      loop(-90, 0.6, 30),
      loop(-180, 0.6, 0),
      loop(-270, 0.64, -30),
      loop(-330, 0.7, 10),
      { x: 0.8, y: 0.8, z: 0, space: 'view' },
      { x: 1.2, y: 0.84, z: 0, space: 'view' },
    ] as PathPoint[],
    /** Head / tail keyframes (control-point index + px). The tail is also kept within visibleLength. */
    head: [
      { p: 0, k: -1, px: 0.04 },
      { p: 0.08, k: -1, px: 0.04 },
      { p: 0.4, k: 14, px: 0 },
      { p: 0.6, k: 17.5, px: 0 },
      { p: 0.78, k: 99, px: 0 },
    ] as SnakeKey[],
    tail: [
      { p: 0, k: 0, px: 0 },
      { p: 0.2, k: 0, px: 0 },
      { p: 0.6, k: 8, px: 0 },
      { p: 0.78, k: 99, px: 0 },
    ] as SnakeKey[],
    headMobile: [
      { p: 0, k: -1, px: 0.06 },
      { p: 0.08, k: -1, px: 0.06 },
      { p: 0.4, k: 8, px: 0 },
      { p: 0.6, k: 9.5, px: 0 },
      { p: 0.78, k: 99, px: 0 },
    ] as SnakeKey[],
    tailMobile: [
      { p: 0, k: 0, px: 0 },
      { p: 0.2, k: 0, px: 0 },
      { p: 0.6, k: 4, px: 0 },
      { p: 0.78, k: 99, px: 0 },
    ] as SnakeKey[],
  },
  frame: {
    /** Final frame: width / height (fractions of the viewport), top (fraction), corner radius (px). */
    width: 0.94,
    height: 0.62,
    top: 0.22,
    radius: 14,
    cardRadius: 10,
    /** Turn about the vertical axis at mid-move (degrees). */
    rotationMax: 50,
    rotationMaxMobile: 25,
    /** Trapezoid skew at mid-move (fraction of height per width). */
    skew: 0.12,
    /** Leading-edge curl: strength (1 = curled length ≈ 35 % of the width) and radius (× height). */
    curl: 0.85,
    curlRadius: 0.5,
    /** Flag wave across the surface: amplitude (× width) and wavelength count across the frame. */
    wave: 0.03,
    waveCount: 1.3,
    /** Duotone (shadows → highlights) and the wipe band colours. */
    duoDark: '#3b5bff',
    duoLight: '#c9d0ff',
    bandA: '#3b5bff',
    bandB: '#7b4bff',
    /** Band width (fraction of the diagonal) and edge softness. */
    bandWidth: 0.22,
    bandSoftness: 0.06,
    /**
     * Footage → workflow cross-dissolve, in and just behind the band (fraction of the diagonal):
     * ≈ 0.3 s of the sweep at an ordinary scroll pace.
     */
    dissolve: 0.22,
    /** Fine film grain on the footage duotone (0–0.2). */
    grain: 0.06,
    /** Hover: max tilt toward the cursor (degrees) and ripple amplitude (× width). */
    hoverTilt: 2,
    ripple: 0.0015,
  },
  timing: {
    /** Pinned scroll length (viewport heights). */
    pin: 3,
    pinMobile: 2,
    /** S3, after p: the doors (frame → full screen, words apart) and the INSIDE world (viewport heights). */
    doors: 1,
    doorsMobile: 0.8,
    world: 4,
    worldMobile: 2.5,
    scrub: 1,
    copyIn: [0.18, 0.28] as [number, number],
    headlineExit: [0.3, 0.5] as [number, number],
    copyOut: [0.45, 0.6] as [number, number],
    flex: [0.55, 0.82] as [number, number],
    wipe: [0.62, 0.76] as [number, number],
    words: [0.78, 0.9] as [number, number],
  },
  /** The two huge words that land on the frame — the doors (editable). */
  words: ['STEP', 'INSIDE'] as [string, string],
}

export type FlexParams = typeof flexParams
