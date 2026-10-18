/**
 * Night atmosphere look parameters. Positions are in viewport UV (0–1, origin bottom-left,
 * values outside 0–1 place a light off-screen). Radii are in viewport heights.
 * Every field is wired to Tweakpane in dev (see scene.ts → buildPane).
 */
export interface AtmosphereLight {
  x: number
  y: number
  radius: number
  color: string
  intensity: number
}

export interface AtmosphereParams {
  quality: {
    /** Internal render scale of the fog pass (upscaled with a smooth B-spline filter). */
    internalScale: number
    /** fbm octaves for the far fog layer (1–3). */
    octaves: number
  }
  /** Global speed multiplier for every drift. 1 = authored speed. */
  timeScale: number
  base: {
    /** Upper and lower base colours (tokens). They land exactly on screen — see aces.ts. */
    top: string
    bottom: string
    /** Large, very slow brightness variation so the field is never flat. */
    variation: number
  }
  fog: {
    scale: number
    /** Horizontal frequency multiplier; < 1 lays fog in horizontal banks. */
    stretch: number
    density: number
    contrast: number
    /** Domain-warp strength — what keeps the drift from reading as a scrolling texture. */
    warp: number
    driftX: number
    driftY: number
    /** How fast the noise morphs in place (third noise dimension). Never loops. */
    evolve: number
    /** Near (foreground) layer: larger, darker wisps that drift faster — gives depth. */
    nearAmount: number
    nearScale: number
    nearParallax: number
    /** Faint self-luminance of fog in unlit areas. */
    ambient: number
  }
  key: AtmosphereLight
  fill: AtmosphereLight
  accent: AtmosphereLight
  scatter: {
    /** Light scattered by fog density — reveals fog structure inside the light volume. */
    fog: number
    /** Light scattered by clear air — the soft volume between fog banks. */
    air: number
    /** Core glow around a light, mostly relevant when the light is on screen. */
    halo: number
    /** Distance falloff steepness (higher = tighter volumes). */
    falloff: number
  }
  shafts: {
    enabled: boolean
    intensity: number
    steps: number
    /** Fraction of the pixel→light distance that is marched. */
    length: number
  }
  scroll: {
    /** Key light offset at uScroll = 1. */
    shiftX: number
    shiftY: number
    /** Key colour multiplier at uScroll = 1 (white = no tint). */
    tint: string
  }
  stir: {
    strength: number
    radius: number
    /** Seconds for a stir to settle back (viscous, never springy). */
    relax: number
  }
  post: {
    exposure: number
    vignette: number
    grain: number
    dither: boolean
  }
}

export type AtmospherePresetName = 'hero' | 'services' | 'contact'

// The original ink-blue night. Services and Contact derive from it; Hero no longer does.
const night: AtmosphereParams = {
  quality: { internalScale: 0.6, octaves: 3 },
  timeScale: 1,
  base: { top: '#0a1222', bottom: '#04060c', variation: 0.25 },
  fog: {
    scale: 1.7,
    stretch: 0.5,
    density: 0.9,
    contrast: 1.3,
    warp: 0.75,
    driftX: 0.008,
    driftY: 0.003,
    evolve: 0.012,
    nearAmount: 0.35,
    nearScale: 0.55,
    nearParallax: 1.8,
    ambient: 0.35,
  },
  // --night-light, top-right, partly off-screen so we see its volume rather than a bulb.
  key: { x: 0.9, y: 1.05, radius: 0.8, color: '#4a6ba3', intensity: 0.95 },
  // Warm, barely-there fill low-left. Hue is a placeholder for the owner to tune.
  fill: { x: 0.08, y: -0.05, radius: 0.6, color: '#b98a5e', intensity: 0.05 },
  accent: { x: 0.45, y: 0.55, radius: 0.5, color: '#4a6ba3', intensity: 0 },
  scatter: { fog: 0.9, air: 0.22, halo: 0.25, falloff: 2.4 },
  shafts: { enabled: true, intensity: 0.05, steps: 8, length: 0.6 },
  scroll: { shiftX: -0.04, shiftY: -0.1, tint: '#f2e6dc' },
  stir: { strength: 0.35, radius: 0.22, relax: 1.6 },
  post: { exposure: 1, vignette: 0.35, grain: 0.02, dither: true },
}

// Owner-tuned (2026-10-18): violet night. Values exactly as supplied (float noise rounded).
// Note: 0.9 internal scale costs ~9–10 ms/frame on Iris Xe vs ~5 ms at 0.6.
const hero: AtmosphereParams = {
  quality: { internalScale: 0.9, octaves: 3 },
  timeScale: 4,
  base: { top: '#3d10e9', bottom: '#04060c', variation: 0.62 },
  fog: {
    scale: 1.36,
    stretch: 0.69,
    density: 0.63,
    contrast: 1.24,
    warp: 1.87,
    driftX: -0.002,
    driftY: 0.043,
    evolve: 0.053,
    nearAmount: 0.55,
    nearScale: 1.01,
    nearParallax: 2.3,
    ambient: 1.94,
  },
  key: { x: 0.81, y: 0.85, radius: 1.11, color: '#1e0edc', intensity: 0.79 },
  fill: { x: 0.13, y: 0.03, radius: 0.86, color: '#1538dd', intensity: 0 },
  accent: { x: 1.18, y: 0.5, radius: 1.76, color: '#643ab6', intensity: 0 },
  scatter: { fog: 1.73, air: 0.81, halo: 0.95, falloff: 6 },
  shafts: { enabled: true, intensity: 0.22, steps: 7, length: 0.63 },
  scroll: { shiftX: 0.265, shiftY: 0.055, tint: '#da8137' },
  stir: { strength: 1, radius: 0.36, relax: 3.6 },
  post: { exposure: 1, vignette: 0.35, grain: 0.02, dither: true },
}

/** Deep copy so presets are never mutated by Tweakpane. */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

// Services and Contact: gentle variations of the original night — starting points for the owner to tune.
export const atmospherePresets: Record<AtmospherePresetName, AtmosphereParams> = {
  hero,
  services: (() => {
    const p = clone(night)
    p.key = { ...p.key, x: 0.62, y: 1.12, radius: 0.9, intensity: 0.85 }
    p.fill.intensity = 0.03
    p.fog = { ...p.fog, density: 1.0, scale: 1.5, driftX: -0.006 }
    p.shafts.intensity = 0.07
    p.post.vignette = 0.4
    return p
  })(),
  contact: (() => {
    const p = clone(night)
    p.key = { ...p.key, x: 0.78, y: 0.9, radius: 0.75, intensity: 0.8 }
    p.fill = { ...p.fill, x: 0.18, y: 0.0, intensity: 0.09 }
    p.fog = { ...p.fog, density: 0.8, warp: 0.9, evolve: 0.009 }
    p.shafts.intensity = 0.03
    return p
  })(),
}

export function presetParams(name: AtmospherePresetName): AtmosphereParams {
  return clone(atmospherePresets[name])
}

/** Overwrite `target` in place (keeps object identity for Tweakpane bindings). */
export function assignParams(target: AtmosphereParams, source: AtmosphereParams) {
  for (const key of Object.keys(source) as (keyof AtmosphereParams)[]) {
    const v = source[key]
    if (typeof v === 'object' && v !== null) Object.assign(target[key] as object, v)
    else (target as unknown as Record<string, unknown>)[key] = v
  }
}

/** Phones / low-power: lower internal resolution, no shafts, cheaper fog. */
export function applyLowPowerOverrides(p: AtmosphereParams) {
  p.quality.internalScale = Math.min(p.quality.internalScale, 0.5)
  p.quality.octaves = Math.min(p.quality.octaves, 2)
  p.shafts.enabled = false
}
