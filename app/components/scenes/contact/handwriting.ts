/**
 * "let's work together", hand-written (F3). No font: every letter is a single-stroke pen centreline
 * drawn here by hand, in writing order, in a space where the x-height is 100 units, the baseline is
 * y = 0 and y grows downward (SVG). Letters inside a word are mostly joined (the pen travels from one
 * letter's exit to the next one's entry); t crossbars and the apostrophe are separate strokes added
 * after their word, as a hand does. A seeded jitter adds the inconsistencies of quick writing.
 *
 * To replace with real handwriting later: trace a scan into the same shape —
 * `HandStroke[]` (points in writing order, optional pressure) — and keep `layoutHandwriting`'s output.
 */
export type Pt = [number, number]

/** A glyph: its strokes (the first may join the previous letter) and its advance width. */
interface Glyph {
  /** Joined into the running word stroke. */
  main?: Pt[]
  /** Separate strokes written later (crossbars) or right away (k's arm, apostrophe). */
  after?: Pt[][]
  /** Strokes that lift the pen and start fresh (k stem, s after an apostrophe…). */
  lift?: boolean
  adv: number
}

// ── Letterforms (control points; smoothed later). Origin: left of the letter on the baseline. ──
const G: Record<string, Glyph> = {
  l: { main: [[10, -168], [8, -120], [6, -66], [6, -24], [11, -6], [22, 0], [34, -8]], adv: 34 },
  e: {
    main: [[2, -30], [24, -40], [44, -52], [50, -72], [40, -94], [20, -98], [6, -84], [0, -54], [6, -20], [22, -2], [42, 0], [58, -12]],
    adv: 60,
  },
  // t: up to the top, back down; the crossbar is written after the word (with a small overshoot).
  t: { main: [[4, -38], [12, -98], [16, -146], [13, -96], [11, -40], [14, -8], [26, 0], [40, -8]], after: [[[-4, -97], [14, -100], [34, -104], [50, -109]]], adv: 42 },
  // Word-initial t: starts at the top.
  T: { main: [[16, -146], [13, -96], [11, -40], [14, -8], [26, 0], [40, -8]], after: [[[-12, -98], [10, -101], [34, -104], [52, -110]]], adv: 42 },
  // A quick flick.
  "'": { after: [[[6, -170], [3, -156], [-2, -138]]], lift: true, adv: 14 },
  s: {
    main: [[46, -86], [34, -98], [16, -98], [4, -86], [8, -66], [28, -54], [46, -38], [48, -18], [36, -3], [16, 0], [2, -8]],
    lift: true,
    adv: 54,
  },
  w: {
    main: [[0, -94], [5, -50], [11, -8], [18, -4], [27, -40], [33, -64], [38, -40], [45, -8], [52, -4], [60, -48], [66, -96]],
    lift: true,
    adv: 70,
  },
  o: {
    main: [[24, -99], [8, -86], [0, -54], [6, -18], [24, 0], [42, -6], [52, -36], [50, -74], [38, -96], [26, -99], [40, -93], [58, -90]],
    adv: 62,
  },
  // o after a lifted pen (word-internal, e.g. "to"): same shape, no entry.
  O: {
    main: [[24, -99], [8, -86], [0, -54], [6, -18], [24, 0], [42, -6], [52, -36], [50, -74], [38, -96], [26, -99], [40, -93], [58, -90]],
    lift: true,
    adv: 62,
  },
  r: { main: [[2, -84], [5, -56], [5, -26], [4, 0], [6, -44], [16, -78], [30, -94], [44, -96], [52, -86]], adv: 54 },
  // k: stem lifts; the arm is its own stroke.
  k: {
    main: [[8, -168], [6, -110], [5, -54], [5, 0]],
    after: [[[48, -96], [32, -76], [8, -50], [20, -52], [32, -36], [42, -12], [54, 2]]],
    lift: true,
    adv: 56,
  },
  g: {
    // A round, closed bowl (down to near the baseline), then the stem from the top right into the descender.
    main: [[30, -98], [12, -90], [2, -62], [5, -30], [22, -12], [40, -20], [50, -52], [51, -90], [50, -99], [50, -56], [49, -4], [45, 34], [33, 62], [15, 72], [1, 64], [-5, 48]],
    adv: 58,
  },
  h: {
    lift: true,
    main: [[10, -168], [8, -104], [6, -44], [6, 0], [7, -42], [16, -76], [32, -94], [46, -88], [52, -64], [52, -28], [55, -6], [64, 0], [72, -8]],
    adv: 72,
  },
}

/** Letters that end the running stroke (the next letter starts with the pen lifted). */
const LIFT_AFTER = new Set(['g'])

// ── Smoothing and resampling ──
function catmullRom(points: Pt[], samples = 8): Pt[] {
  if (points.length < 3) return points.slice()
  const out: Pt[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    for (let s = 0; s < samples; s++) {
      const t = s / samples
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(points[points.length - 1]!)
  return out
}

function resample(points: Pt[], spacing: number): Pt[] {
  const out: Pt[] = [points[0]!]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    let [ax, ay] = points[i - 1]!
    const [bx, by] = points[i]!
    let seg = Math.hypot(bx - ax, by - ay)
    while (carry + seg >= spacing) {
      const t = (spacing - carry) / seg
      ax += (bx - ax) * t
      ay += (by - ay) * t
      out.push([ax, ay])
      seg = Math.hypot(bx - ax, by - ay)
      carry = 0
    }
    carry += seg
  }
  const last = points[points.length - 1]!
  if (Math.hypot(last[0] - out[out.length - 1]![0], last[1] - out[out.length - 1]![1]) > spacing * 0.3) out.push(last)
  return out
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface HandStroke {
  /** Points in writing order, layout units. */
  points: Pt[]
  /** Per-point pen pressure 0–1. */
  pressure: number[]
  /** Arc length (layout units). */
  length: number
  /** Pause before this stroke (fraction of a stroke-length budget): word gaps, crossbars. */
  pauseBefore: number
}

export interface HandLayout {
  strokes: HandStroke[]
  /** Bounding box of everything (layout units). */
  box: { x: number; y: number; w: number; h: number }
}

export const handParams = {
  /** Horizontal scale of the letterforms (handwriting is wider than the raw glyphs). */
  widthScale: 1.32,
  /** Space between words and between lines (layout units). */
  wordGap: 66,
  lineGap: 236,
  /** Forward lean (shear) and its per-word wobble. */
  slant: 0.1,
  slantWobble: 0.035,
  /** Per-letter baseline drift and width variation. */
  baselineJitter: 3.2,
  widthJitter: 0.08,
  /** Low-frequency tremor along the line (units). */
  tremor: 0.7,
  seed: 11,
}

/**
 * Lay out lines of text into pen strokes. Each line is a list of words; letters come from the glyph
 * set (an uppercase 'T' means a word-initial t).
 */
export function layoutHandwriting(lines: readonly (readonly string[])[]): HandLayout {
  const P = handParams
  const rand = rng(P.seed)
  const jit = (a: number) => (rand() * 2 - 1) * a
  const strokes: HandStroke[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  lines.forEach((words, li) => {
    let x = jit(10)
    const baseY = li * P.lineGap + jit(4)
    words.forEach((word, wi) => {
      const slant = P.slant + jit(P.slantWobble)
      const wordDy = jit(4)
      const place = (p: Pt, lx: number, dy: number, sx: number): Pt => {
        const px = lx + p[0] * sx
        const py = baseY + wordDy + dy + p[1]
        // Lean forward: points higher up move right.
        return [px - py * slant + baseY * slant, py]
      }
      let running: Pt[] = []
      const later: Pt[][] = []
      const flush = () => {
        if (running.length > 1) strokes.push(makeStroke(running, wi > 0 && strokes.length > 0 ? 0.6 : 0.15))
        running = []
      }
      for (const ch of word) {
        const g = G[ch]
        if (!g) continue
        const sx = P.widthScale * (1 + jit(P.widthJitter))
        const dy = jit(P.baselineJitter)
        if (g.lift) flush()
        if (g.main) running.push(...g.main.map((p) => place(p, x, dy, sx)))
        for (const a of g.after ?? []) {
          const pts = a.map((p) => place(p, x, dy, sx))
          // The apostrophe is written right away; crossbars and the k's arm after the letter / word.
          if (ch === "'" || ch === 'k') {
            flush()
            strokes.push(makeStroke(pts, 0.25))
          } else later.push(pts)
        }
        if (LIFT_AFTER.has(ch)) flush()
        x += g.adv * sx + 3 + jit(3)
      }
      flush()
      for (const l of later) strokes.push(makeStroke(l, 0.35))
      x += P.wordGap + jit(8)
    })
  })

  function makeStroke(control: Pt[], pauseBefore: number): HandStroke {
    const smooth = resample(catmullRom(control), 2.2)
    // Tremor: a slow wobble perpendicular-ish to the stroke.
    const ph = rand() * 10
    const pts: Pt[] = smooth.map(([px, py], i) => [px + Math.sin(i * 0.11 + ph) * P.tremor, py + Math.cos(i * 0.07 + ph * 1.7) * P.tremor])
    // Pressure: heavier going down, lighter going up; the ends are tapered by the renderer.
    const pressure = pts.map((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)]!
      const prev = pts[Math.max(0, i - 1)]!
      const dy = q[1] - prev[1]
      const len = Math.hypot(q[0] - prev[0], dy) || 1
      return Math.min(1, Math.max(0.2, 0.5 + 0.28 * (dy / len)))
    })
    let length = 0
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
    for (const [px, py] of pts) {
      minX = Math.min(minX, px)
      maxX = Math.max(maxX, px)
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
    }
    return { points: pts, pressure, length, pauseBefore }
  }

  return { strokes, box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } }
}

/** The headline, per layout. 'T' = word-initial t, 'O' = o after a pen lift. */
export const HEADLINE = {
  desktop: [["let's", 'work'], ['TOgether']],
  mobile: [["let's"], ['work'], ['TOgether']],
} as const

export const HEADLINE_TEXT = "let's work together"
