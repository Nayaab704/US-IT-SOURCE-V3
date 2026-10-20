/**
 * "Inside" (phase S3): the monochrome world the visitor enters through the flexible frame.
 * World units: the camera starts at z = 0, the beam stands at z = beam.z; floor at y = 0.
 */
export const insideParams = {
  fog: {
    /** Sky / fog: top of the view and at the horizon. */
    top: '#07080a',
    horizon: '#2a2d33',
    /** Exponential fog density (per unit) and height falloff (fog thins with height). */
    density: 0.0085,
    heightFalloff: 0.06,
  },
  floor: {
    size: 700,
    segments: 256,
    segmentsMobile: 128,
    /** Dune height (units) and scale (cycles per unit). */
    duneAmplitude: 3.2,
    duneScale: 0.012,
    grain: 0.06,
    roughness: 0.55,
    /** Brightness of the beam's reflection streak on the floor. */
    streak: 0.45,
  },
  beam: {
    z: -230,
    radius: 5,
    height: 260,
    intensity: 6,
    /** Pool of light where the beam meets the floor (radius, intensity). */
    poolRadius: 18,
    pool: 0.55,
    dust: 420,
  },
  shards: {
    count: 6000,
    countMobile: 1500,
    /** Base size (units) and the size spread (×1–6). */
    size: 0.2,
    sizeSpread: 6,
    /** Cloud: radius around the beam axis, centre height, vertical spread. */
    cloudRadius: 150,
    cloudHeight: 28,
    cloudSpread: 26,
    glint: 1.4,
    /** Near shards turn into soft bokeh discs within this distance of the camera. */
    bokehNear: 9,
    bokeh: 0.6,
  },
  lattice: {
    /** 0 = cylinder grid, 1 = cuboctahedral shell. */
    shape: 0,
    radius: 26,
    height: 90,
    baseY: 6,
    spin: 0.04,
  },
  line: {
    /** Thin: reads as a drawn line at eye height, not a road. */
    radius: 0.07,
    glow: 2.6,
  },
  camera: {
    height: 2.5,
    /** How far the camera glides by q = 0.70 (fraction of the way to the beam). */
    glide: 0.82,
    swayRoll: 1,
    swayYaw: 2,
    look: 2,
    fov: 50,
  },
  post: {
    /** Max render resolution of the world (device px per CSS px). */
    maxDpr: 1,
    /**
     * MSAA samples of the HDR scene target. 0: on integrated GPUs a multisampled half-float target
     * costs ~10 ms a frame at 1440x900; the film grain hides the facet aliasing.
     */
    msaa: 0,
    exposure: 1.05,
    bloomThreshold: 2.2,
    bloomStrength: 0.55,
    vignette: 0.35,
    grain: 0.035,
  },
  /** Drift speeds of the phrases (× scroll), left / right alternate. */
  text: {
    speeds: [0.9, 1.2, 0.7, 1.4, 0.6],
    labelSpeeds: [0.5, 0.8, 0.65, 1.1],
  },
}

export type InsideParams = typeof insideParams
