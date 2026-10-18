/**
 * Pieces in fluid + hero assembly — every coefficient that affects look or feel
 * (ART_DIRECTION §3 "Feel", §4 1A/1B).
 * Units: world units (viewport ≈ 10.7 units tall at z = 0), seconds. Hero progress p is 0–1.
 * Layout / geometry fields apply on reload; everything else is live in Tweakpane.
 */
export const piecesParams = {
  layout: {
    /** Deterministic: the same composition on every load. */
    seed: 7,
    /** Share of pieces in the near and mid layers; the rest are far. (Count = pieces in the SVG.) */
    nearShare: 0.27,
    midShare: 0.4,
    nearZ: 2.5,
    midZ: -1.5,
    farZ: -9,
    /** Floating size relative to the piece's size in the assembled logotype. */
    nearScale: 1.15,
    midScale: 0.9,
    farScale: 0.8,
    scaleJitter: 0.25,
    /** Keep pieces off the copy (viewport fractions, origin bottom-left). */
    excludeX: 0.42,
    excludeY: 0.3,
    /** Max resting tilt out of the screen plane (radians) — shows thickness and bevels. */
    tilt: 0.45,
    /** Fraction of pieces in matte ceramic; the rest are aluminium. */
    ceramicShare: 0.5,
  },
  geometry: {
    /** Fractions of the logotype cap height — identical thickness for every fragment. */
    depth: 0.08,
    bevel: 0.018,
  },
  idle: {
    /** Drift radius around the anchor. */
    amplitude: 0.45,
    /** Drift speed (rad/s base frequency). */
    speed: 0.45,
    /** Idle rotation wander (radians). */
    rotation: 0.225,
  },
  pointer: {
    /** Influence radius on each layer's plane. */
    radius: 3.7,
    /** Force per unit of pointer velocity — slow hover ≈ nothing, fast sweep pushes. */
    push: 3.76,
    /** Below this pointer speed (NDC/s) there is no force at all. */
    deadzone: 0.77,
    /** Tilt and in-plane spin induced by the push. */
    tilt: 1.28,
    spin: 0.56,
    /** Slight push back into depth. */
    depthPush: 0.4,
    /** Far layer feels less of the cursor (parallax). Mid is halfway. */
    farFactor: 0.35,
  },
  physics: {
    /** Spring back to the anchor (per unit mass). */
    anchorStiffness: 3.45,
    /** Strong linear drag — the "thick fluid". Above ≈ 2·√stiffness = overdamped, never springy. */
    linearDrag: 3.97,
    rotStiffness: 1.33,
    /** Slow angular damping: spins linger, but still settle without overshoot. */
    angularDrag: 2.3,
    collisions: true,
    /** Very low restitution: pieces nudge, never bounce. */
    restitution: 0.05,
    /** Collision sphere = bounding radius × this (outlines don't fill their bounds). */
    collisionScale: 0.72,
    /** Fraction of the overlap resolved per substep — soft, no snapping. */
    collisionSoftness: 0.35,
  },
  look: {
    keyIntensity: 4.15,
    envIntensity: 1.25,
    // anisotropy (brushed) stays 0 for now: ExtrudeGeometry's side-wall UVs give three a discontinuous
    // brush direction, which shows as dotted highlights along bevels. Needs custom bevel UVs.
    aluminium: { color: '#ab7fab', roughness: 0.3, anisotropy: 0 },
    ceramic: { color: '#f1efea', roughness: 0.55, clearcoat: 0.29, clearcoatRoughness: 0.46 },
    /** Out-of-focus pieces: blur-pass resolution (softness), brightness and opacity (haze shows through). */
    farResolution: 0.45,
    farDim: 0.56,
    farOpacity: 0.8,
  },
  /** Depth of field: blur ramps in between these distances BEHIND the logotype plane (focus). */
  dof: {
    start: 3.5,
    end: 9,
  },
  assembly: {
    /** p range of the assembly (pieces travel home). */
    start: 0.12,
    end: 0.7,
    /** Share of the range used to stagger starts (far pieces later). */
    stagger: 0.25,
    /** Last fraction of each piece's travel in which rotation resolves to 0 — the "click". */
    rotateTail: 0.3,
    /** Sideways bend of each travel path (fraction of its distance). */
    bend: 0.35,
    /** Bow toward the camera mid-travel (fraction of distance). */
    bulge: 0.15,
    /** Assembled logotype: plane depth, width as a fraction of viewport width, centre from top. */
    homeZ: 0,
    widthDesktop: 0.76,
    widthMobile: 0.88,
    centerFromTop: 0.42,
  },
  /** Seam light sweep: a thin band of light crossing the assembled logotype left → right, one pass. */
  sweep: {
    start: 0.62,
    end: 0.74,
    /** Peak brightness added on bevels/seams (display space, 0–1+). */
    intensity: 0.9,
    /** Band width (world units; the cap height is ≈ 1.4 at 1440 wide). */
    width: 0.35,
    /** How much of the band reaches the flat faces (0 = seams and bevels only). */
    faces: 0.12,
    color: '#ffffff',
  },
  /** After assembly (desktop only): the piece under the cursor lifts toward the camera. */
  hover: {
    /** p from which hover is live. */
    from: 0.74,
    lift: 1.2,
    /** Tilt toward the key light while lifted (radians) — catches a little more light. */
    tilt: 0.12,
    /** Per-frame (60 fps) easing of the lift. */
    ease: 0.12,
  },
  /** Dev only: scrub the hero progress without scrolling. */
  debug: {
    overrideP: false,
    p: 0,
  },
}

export type PiecesParams = typeof piecesParams
