/**
 * Ribbon look-dev (ART_DIRECTION v2 §4.2, refine 2): an INFLATED LATEX ribbon — a puffy, glossy
 * black cushion tube in a near-black void, lit only by broad softbox reflections. It can go from
 * crumpled (deflated, creased) to taut (inflated), shivers very finely all the time, and its surface
 * behaves like liquid under the cursor (wave simulation in the ribbon's own UV space).
 * World units: the workflow path spans `scale`.
 * Geometry fields rebuild the mesh; softbox / floor fields re-bake the environment; the rest is live.
 */
export interface Softbox {
  color: string
  /** HDR multiplier on the colour (the environment is half-float). */
  intensity: number
  /** Direction from the ribbon, degrees (azimuth around y, elevation above the horizon). */
  azimuth: number
  elevation: number
  /** Panel size as seen from the ribbon, degrees — big panels make broad sheens, not lines. */
  angularWidth: number
  angularHeight: number
  /** Roll of the panel around its facing axis, degrees. */
  roll: number
  /** Edge falloff (0 = hard-edged panel, 1 = all gradient). */
  softness: number
}

export interface Framing {
  /** Point on the ribbon the camera looks at: 0–1 along the workflow path (tails excluded). */
  u: number
  /** Camera position relative to that point, world units. */
  offset: { x: number; y: number; z: number }
  fov: number
}

export interface Twist {
  /** Where along the path (0–1), how much extra roll (radians), over what span (0–1). */
  u: number
  amount: number
  span: number
}

export const ribbonParams = {
  geometry: {
    /** World size of the workflow path. */
    scale: 10,
    /** Over/under depth: height varies ±this × scale so the loop passes over itself. */
    depth: 0.08,
    /** The weave: how many half-waves of height along the path, and where they start (radians). */
    depthWaves: 2.75,
    depthPhase: -2.25,
    /** Control points kept after simplifying the path (big sweeping arcs only). */
    controlPoints: 14,
    /** Laplacian smoothing passes on those control points. */
    smoothing: 1,
    /** Extra straight length at both ends (× scale), so the cut ends never enter the frame. */
    tail: 0.6,
    /** Ribbon width (world units) and width : thickness ratio. */
    width: 1.5,
    widthToThickness: 2.2,
    /** Cushion cross-section: superellipse exponent (2 = ellipse, higher = boxier) … */
    superellipse: 2.6,
    /** … plus the inflation bulge: the faces swell by this fraction of the thickness at the middle. */
    bulge: 0.15,
    /** Cross-section segments, and segments along the workflow path / along each tail. */
    ringSegments: 64,
    segments: 960,
    tailSegments: 40,
    ringSegmentsMobile: 48,
    segmentsMobile: 320,
    twists: [
      { u: 0.16, amount: Math.PI * 0.5, span: 0.05 },
      { u: 0.8, amount: -Math.PI * 0.5, span: 0.05 },
    ] as Twist[],
  },
  softboxes: {
    /** Two big electric-blue panels raking from the sides. */
    blueA: { color: '#3b5bff', intensity: 2.5, azimuth: 60, elevation: 18, angularWidth: 30, angularHeight: 26, roll: 10, softness: 0.65 } as Softbox,
    blueB: { color: '#3b5bff', intensity: 2.5, azimuth: -120, elevation: 14, angularWidth: 30, angularHeight: 26, roll: -8, softness: 0.65 } as Softbox,
    /** Long cool-white strip above: the white highlight running along the top curves. */
    strip: { color: '#dde4ff', intensity: 2.5, azimuth: 0, elevation: 78, angularWidth: 100, angularHeight: 9, roll: 0, softness: 0.7 } as Softbox,
    kicker: { color: '#f0c58c', intensity: 1.2, azimuth: 120, elevation: -6, angularWidth: 8, angularHeight: 6, roll: 0, softness: 0.6 } as Softbox,
  },
  /** Faint studio floor + wall so the black body always reads as a solid object. */
  floor: {
    color: '#0b0e16',
    intensity: 0.06,
    /** Direction of the wall (degrees azimuth). */
    wallAzimuth: -60,
  },
  material: {
    color: '#04050a',
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    /** Soft latex sheen at grazing angles. */
    sheen: 0.25,
    sheenColor: '#5b6bff',
    sheenRoughness: 0.6,
    /** Reflection gain the sheen sees (the envIntensity gain is divided back out for it). */
    sheenGain: 3,
    /**
     * Global gain on every reflection. Lacquer reflects only ~4–5 % head-on (Fresnel), so the panel
     * intensities above are relative; this sets how bright the whole studio reads on the surface.
     */
    envIntensity: 10,
  },
  post: {
    exposure: 1.3,
    /** 0 = ACES, 1 = AgX. */
    toneMapper: 1,
    /** The void: --void; top lift (fraction) — 0 = pure #020306. */
    voidFalloff: 0,
    grain: 0.006,
    dither: true,
  },
  life: {
    /** Seconds per full turn of the ribbon (≥ 240). */
    rotationPeriod: 300,
    /** Environment rotation speed (rad/s) — what makes the sheens slide over the surface. */
    envRotationSpeed: 0.012,
    /** Camera drift amplitude (world units). */
    drift: 0.06,
    /** Camera parallax from the cursor (degrees, each axis) and its smoothing time (s). */
    parallax: 1.5,
    parallaxLag: 0.8,
  },
  /** Inflation: 1 = taut, smooth, fully inflated; 0 = crumpled, deflated latex. */
  inflate: {
    value: 1,
    /** Fold depth when fully deflated, fraction of the thickness (eased by (1 − inflate)²). */
    foldAmplitude: 0.25,
    /** Fold frequency (cycles per world unit along the ribbon) and across-vs-along ratio (< 1 → creases run across). */
    foldScale: 0.6,
    foldAnisotropy: 0.35,
    /** Crease sharpness (higher = sharper ridges). */
    foldSharpness: 2.2,
    /** How much thinner the cross-section gets when deflated. */
    thinning: 0.35,
    /** Thickness overshoot (pop-taut) peak and where it peaks. */
    overshoot: 0.03,
    overshootAt: 0.85,
    /** "Play inflate" tween length (s). */
    playDuration: 1.8,
  },
  /** Always-on membrane shiver: tiny, fast, smooth. */
  shiver: {
    /** Displacement, fraction of the thickness (0.004–0.008). */
    amplitude: 0.005,
    /** Spatial frequency: cycles per world unit (≈ 50 across the ~14 units of ribbon in frame). */
    frequency: 3.5,
    /** Temporal rate (≈ Hz). */
    speed: 8,
    /** How much of the shiver's true slope reaches the normals (highlights quiver, never hammer). */
    normal: 0.08,
  },
  /** Liquid surface: damped wave equation on a height field in the ribbon's UV space. */
  waves: {
    /** Wave speed (world units / s). */
    speed: 1.6,
    /** Damping (1/s) — the main wave dies out in ~1.5–2.5 s. */
    damping: 1.9,
    /** Viscosity: damps fine ripples faster than broad ones (the "skin" smooths out first). */
    viscosity: 0.004,
    /** Pull back to flat (1/s), so the surface is perfectly calm once idle. */
    restore: 1.1,
    /** Impulse per unit of pointer speed above a slow hover (NDC/s), and the capped hover push. */
    impulse: 70,
    hoverImpulse: 1.5,
    /** Impulse radius (world units). */
    radius: 0.5,
    /** Max displacement along the normal, fraction of the thickness. */
    amplitude: 0.15,
    /** Normal tilt multiplier on top of the true slope (makes reflections wobble visibly). */
    bump: 2.2,
    /** Global wobble: max bend (fraction of the ribbon's length), spring stiffness, damping ratio. */
    wobble: 0.015,
    wobbleStiffness: 9,
    wobbleDamping: 0.85,
  },
  /** Active framing (0–2) and the three saved framings. */
  framing: 0,
  framings: [
    { u: 0.2, offset: { x: -6.8, y: 5.6, z: -5.6 }, fov: 32 },
    { u: 0.24, offset: { x: -7.5, y: 6, z: -4.5 }, fov: 32 },
    { u: 0.2, offset: { x: 7, y: 8, z: -6 }, fov: 32 },
  ] as Framing[],
}

export type RibbonParams = typeof ribbonParams
