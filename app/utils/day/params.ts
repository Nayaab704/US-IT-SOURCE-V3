/**
 * Day atmosphere — "window light on paper" (ART_DIRECTION §1 Day, §2).
 * Lengths are in viewport heights; positions in viewport UV (0–1, origin bottom-left; values
 * outside 0–1 place the window off-screen). Every field is wired to Tweakpane in dev.
 */
export interface DayParams {
  quality: {
    /** Internal resolution of the light/shadow pass (soft, so it upscales invisibly). */
    internalScale: number
  }
  /** Global speed multiplier for drift and clouds. */
  timeScale: number
  paper: {
    /** Ground colour — lands exactly on screen (no tone mapping in the day world). */
    color: string
    /** Large, very slow tonal variation (± luminance). */
    tonal: number
    tonalScale: number
    /** Fine fibre texture at full resolution (± luminance) — reads as paper only up close. */
    fibre: number
    /** Fibre size multiplier (1 = ~1–2 CSS px grain, ~20 px fibres). */
    fibreScale: number
  }
  light: {
    /** Where the window's light enters (upper-right, partly off-screen). */
    x: number
    y: number
    /** Direction the light travels across the paper, degrees (180 = leftward, 270 = downward). */
    angle: number
    /** Size of the projected window: along the light and across it. */
    length: number
    width: number
    /** Perspective: the patch widens with distance from the window. */
    spread: number
    /** Shear of the frame bars relative to the light direction (low sun, window above-right). */
    skew: number
    /** Extra luminance inside the patch (0.05 = +5%). */
    intensity: number
    /** Warm tint of the light (near-white; only its hue is used). */
    tint: string
  }
  frame: {
    /** Vertical bars (2–3) and the transom's position along the window (0 = top, 1 = sill). */
    mullions: number
    transom: number
    /** Bar width as a fraction of the window width. */
    bar: number
    /** Shadow depth vs. paper (0.075 = 7.5% darker). */
    strength: number
    /** Cool tint of the shadow (near-white; only its hue is used — a hint of ink blue). */
    tint: string
    /** Penumbra width near the window and at the far end (viewport heights). */
    penumbraNear: number
    penumbraFar: number
  }
  drift: {
    /** How far the whole pattern wanders (viewport heights) — slowest cycle > 60 s, never loops. */
    amount: number
    /** Rotation wander (radians). */
    rotation: number
  }
  clouds: {
    enabled: boolean
    /** Random gap between passing clouds (s). */
    minInterval: number
    maxInterval: number
    /** Light dimming at the deepest point, picked randomly between these (0.15 = −15%). */
    minDepth: number
    maxDepth: number
    /** Duration of one passing cloud (s). */
    duration: number
  }
  curtain: {
    enabled: boolean
    /** ± modulation of the light by the sheer's folds. */
    strength: number
    folds: number
    /** How much the folds sway. */
    sway: number
  }
  pointer: {
    /** Pattern shift toward the cursor, fraction of the viewport (≤ 0.01). */
    parallax: number
  }
  post: {
    grain: number
    dither: boolean
  }
  /** Phones: pattern scale so at least two mullions stay on screen. */
  mobileScale: number
}

export type DayPresetName = 'problems' | 'approach' | 'people'

const problems: DayParams = {
  quality: { internalScale: 0.5 },
  timeScale: 1,
  paper: { color: '#f1eee7', tonal: 0.02, tonalScale: 0.9, fibre: 0.012, fibreScale: 1 },
  light: {
    x: 0.97,
    y: 1.06,
    angle: 214,
    length: 1.45,
    width: 0.78,
    spread: 0.35,
    skew: 0.18,
    intensity: 0.05,
    tint: '#fff4e6',
  },
  frame: {
    mullions: 2,
    transom: 0.36,
    bar: 0.055,
    strength: 0.08,
    tint: '#eef2fb',
    penumbraNear: 0.008,
    penumbraFar: 0.075,
  },
  drift: { amount: 0.025, rotation: 0.015 },
  clouds: { enabled: true, minInterval: 20, maxInterval: 40, minDepth: 0.08, maxDepth: 0.15, duration: 7 },
  curtain: { enabled: false, strength: 0.03, folds: 9, sway: 0.25 },
  pointer: { parallax: 0.01 },
  post: { grain: 0.012, dither: true },
  mobileScale: 0.6,
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

// Gentle variations of the same afternoon — starting points for the owner to tune.
export const dayPresets: Record<DayPresetName, DayParams> = {
  problems,
  approach: (() => {
    const p = clone(problems)
    p.light = { ...p.light, x: 0.9, y: 1.1, angle: 222, length: 1.55, width: 0.85, intensity: 0.045 }
    p.frame = { ...p.frame, mullions: 3, transom: 0.32, penumbraFar: 0.09 }
    return p
  })(),
  people: (() => {
    const p = clone(problems)
    p.light = { ...p.light, angle: 206, length: 1.35, intensity: 0.06, tint: '#ffeedd' }
    p.frame = { ...p.frame, strength: 0.065, penumbraNear: 0.014, penumbraFar: 0.095 }
    return p
  })(),
}

export function dayPresetParams(name: DayPresetName): DayParams {
  return clone(dayPresets[name])
}

/** Overwrite `target` in place (keeps object identity for Tweakpane bindings). */
export function assignDayParams(target: DayParams, source: DayParams) {
  for (const key of Object.keys(source) as (keyof DayParams)[]) {
    const v = source[key]
    if (typeof v === 'object' && v !== null) Object.assign(target[key] as object, v)
    else (target as unknown as Record<string, unknown>)[key] = v
  }
}

/** Phones / low-power: lower internal resolution, no curtain. (Pattern scale is applied in the scene.) */
export function applyDayMobileOverrides(p: DayParams) {
  p.quality.internalScale = Math.min(p.quality.internalScale, 0.4)
  p.curtain.enabled = false
}
