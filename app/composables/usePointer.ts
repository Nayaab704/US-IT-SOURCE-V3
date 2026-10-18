/**
 * Shared pointer input for every scene.
 * Coordinates are normalized device coordinates: x, y ∈ [-1, 1], y up, (0, 0) = viewport centre.
 * Kept as a plain mutable object (not Vue-reactive) because it is read every frame.
 */
export interface PointerState {
  /** Raw position. */
  x: number
  y: number
  /** Position eased towards the raw one (pointerParams.lerp). */
  smoothX: number
  smoothY: number
  /** Velocity in NDC units per second, lightly smoothed. */
  vx: number
  vy: number
  speed: number
  /** False until the first move, and while the pointer is outside the window. */
  inside: boolean
}

export const pointerParams = {
  /** Per-frame (at 60 fps) follow factor. ART_DIRECTION §3: 0.08–0.12 for the thick-fluid feel. */
  lerp: 0.1,
  /** Per-frame smoothing of velocity; higher = more responsive, noisier. */
  velocitySmoothing: 0.25,
}

const state: PointerState = { x: 0, y: 0, smoothX: 0, smoothY: 0, vx: 0, vy: 0, speed: 0, inside: false }
let lastX = 0
let lastY = 0
let initialised = false

function onMove(e: PointerEvent) {
  state.x = (e.clientX / window.innerWidth) * 2 - 1
  state.y = -((e.clientY / window.innerHeight) * 2 - 1)
  if (!state.inside) snapToCurrent()
  state.inside = true
}

// Entering the window (or a new touch) starts a new stroke: the jump from the last known
// position is not movement, and must not register as a velocity spike.
function snapToCurrent() {
  state.smoothX = state.x
  state.smoothY = state.y
  lastX = state.x
  lastY = state.y
  state.vx = state.vy = state.speed = 0
}

function onLeave() {
  state.inside = false
}

// Touch: pointermove is cancelled as soon as the browser starts scrolling, but passive
// touchmove keeps firing — so a drag still pushes things while the page scrolls.
function onTouch(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  state.x = (t.clientX / window.innerWidth) * 2 - 1
  state.y = -((t.clientY / window.innerHeight) * 2 - 1)
  if (e.type === 'touchstart' || !state.inside) snapToCurrent()
  state.inside = true
}

function onTouchEnd() {
  state.inside = false
}

/** Frame-rate independent version of `a += (b - a) * f` where f is tuned for 60 fps. */
function damp(factor: number, delta: number) {
  return 1 - Math.pow(1 - factor, delta * 60)
}

/** Advance smoothing/velocity. The stage calls this once per rendered frame. */
export function tickPointer(delta: number) {
  if (delta <= 0) return
  const k = damp(pointerParams.lerp, delta)
  state.smoothX += (state.x - state.smoothX) * k
  state.smoothY += (state.y - state.smoothY) * k

  const kv = damp(pointerParams.velocitySmoothing, delta)
  state.vx += ((state.x - lastX) / delta - state.vx) * kv
  state.vy += ((state.y - lastY) / delta - state.vy) * kv
  state.speed = Math.hypot(state.vx, state.vy)
  lastX = state.x
  lastY = state.y
}

/** Call when ticking resumes after a pause so the gap doesn't register as a velocity spike. */
export function resetPointerVelocity() {
  lastX = state.x
  lastY = state.y
  state.vx = state.vy = state.speed = 0
}

export function usePointer(): Readonly<PointerState> {
  if (import.meta.client && !initialised) {
    initialised = true
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  }
  return state
}
