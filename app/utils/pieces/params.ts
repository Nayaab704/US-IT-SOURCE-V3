/**
 * Pieces in fluid — every coefficient that affects look or feel (ART_DIRECTION §3 "Feel").
 * Units: world units (viewport ≈ 10.7 units tall at z = 0), seconds.
 * Geometry / layout fields apply on reload; everything else is live in Tweakpane.
 */
export const piecesParams = {
  layout: {
    count: 30,
    countMobile: 14,
    /** Deterministic: the same composition on every load. */
    seed: 7,
    /** Share of pieces in the near and mid layers; the rest are far. */
    nearShare: 0.27,
    midShare: 0.4,
    nearZ: 2.5,
    midZ: -1.5,
    farZ: -9,
    nearScale: 1.15,
    midScale: 0.9,
    farScale: 0.8,
    scaleJitter: 0.25,
    /** Keep pieces off the copy (viewport fractions, origin bottom-left). */
    excludeX: 0.42,
    excludeY: 0.3,
    /** Max resting tilt out of the screen plane (radians) — shows thickness and bevels. */
    tilt: 0.45,
  },
  geometry: {
    unitsPerPx: 0.012,
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
    /** Far layer: internal resolution (softness), brightness and opacity (atmosphere haze shows through). */
    farResolution: 0.45,
    farDim: 0.56,
    farOpacity: 0.8,
  },
}

export type PiecesParams = typeof piecesParams
