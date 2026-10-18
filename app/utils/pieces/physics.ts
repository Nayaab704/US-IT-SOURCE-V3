import { Quaternion, Vector3 } from 'three'
import type { PiecesParams } from './params'

/** Custom damped simulation (CLAUDE.md: no physics engine unless asked). */
export interface Body {
  layer: 0 | 1 | 2 // near, mid, far
  position: Vector3
  velocity: Vector3
  rotation: Quaternion
  angular: Vector3
  anchor: Vector3
  anchorRotation: Quaternion
  scale: number
  radius: number
  mass: number
  inertia: number
  /** 0–1 multiplier on the cursor force — fades to 0 as the piece assembles into its slot. */
  influence: number
  /** Per-body phases/frequencies for idle drift (incommensurate → never visibly repeats). */
  seeds: [number, number, number, number, number, number]
}

export interface PointerField {
  active: boolean
  /** Pointer on each layer's plane (world units) and its velocity (world units/s). */
  positions: [Vector3, Vector3, Vector3]
  velocities: [Vector3, Vector3, Vector3]
  /** Pointer speed in NDC/s — used for the dead zone. */
  speedNdc: number
}

const SUBSTEP = 1 / 120
const MAX_SUBSTEPS = 8

const _target = new Vector3()
const _force = new Vector3()
const _torque = new Vector3()
const _d = new Vector3()
const _q = new Quaternion()
const _wq = new Quaternion()

export class PieceSimulation {
  time = 0
  private acc = 0

  constructor(
    readonly bodies: Body[],
    private readonly params: PiecesParams,
    public collisions = true,
  ) {}

  step(delta: number, field: PointerField) {
    this.acc = Math.min(this.acc + delta, SUBSTEP * MAX_SUBSTEPS)
    while (this.acc >= SUBSTEP) {
      this.substep(SUBSTEP, field)
      this.acc -= SUBSTEP
      this.time += SUBSTEP
    }
  }

  /** Static composed arrangement (reduced motion): everything exactly at its anchor. */
  rest() {
    for (const b of this.bodies) {
      b.position.copy(b.anchor)
      b.rotation.copy(b.anchorRotation)
      b.velocity.set(0, 0, 0)
      b.angular.set(0, 0, 0)
    }
  }

  private substep(dt: number, field: PointerField) {
    const { idle, pointer, physics } = this.params
    const t = this.time
    const linDamp = Math.exp(-physics.linearDrag * dt)
    const angDamp = Math.exp(-physics.angularDrag * dt)
    const speedGate = field.active ? Math.max(0, field.speedNdc - pointer.deadzone) / Math.max(field.speedNdc, 1e-4) : 0

    for (const b of this.bodies) {
      const s = b.seeds
      const w = idle.speed
      // Idle target: anchor + slow drift from two incommensurate sines per axis.
      _target.set(
        Math.sin(t * w * s[0] + s[3]) + 0.5 * Math.sin(t * w * 1.73 * s[1] + s[4]),
        Math.sin(t * w * s[1] + s[5]) + 0.5 * Math.sin(t * w * 1.37 * s[2] + s[3]),
        0.4 * Math.sin(t * w * 0.7 * s[2] + s[4]),
      )
        .multiplyScalar(idle.amplitude)
        .add(b.anchor)

      _force.subVectors(_target, b.position).multiplyScalar(physics.anchorStiffness * b.mass)
      _torque.set(0, 0, 0)

      // Pointer: a force field proportional to pointer VELOCITY, falling off with distance.
      if (speedGate > 0) {
        const pp = field.positions[b.layer]
        const pv = field.velocities[b.layer]
        _d.subVectors(b.position, pp)
        _d.z = 0
        const fall = Math.exp(-_d.lengthSq() / (pointer.radius * pointer.radius))
        if (fall > 1e-3 && b.influence > 0) {
          const layerFactor = b.layer === 2 ? pointer.farFactor : b.layer === 1 ? (1 + pointer.farFactor) / 2 : 1
          const k = pointer.push * fall * layerFactor * speedGate * b.influence
          const fx = pv.x * k
          const fy = pv.y * k
          _force.x += fx
          _force.y += fy
          _force.z -= Math.hypot(fx, fy) * pointer.depthPush
          // Off-centre push spins the piece in-plane; the push also tilts it like a leaf in a current.
          _torque.z += (_d.x * fy - _d.y * fx) * pointer.spin
          _torque.x += -fy * pointer.tilt * b.radius
          _torque.y += fx * pointer.tilt * b.radius
        }
      }

      // Restoring torque toward the anchor orientation (+ idle wander), small-angle form.
      _q.set(
        Math.sin(t * w * 0.9 * s[0] + s[5]) * idle.rotation,
        Math.sin(t * w * 0.8 * s[1] + s[3]) * idle.rotation,
        Math.sin(t * w * 0.6 * s[2] + s[4]) * idle.rotation,
        1,
      ).normalize()
      _q.premultiply(b.anchorRotation).multiply(_wq.copy(b.rotation).invert())
      const sign = _q.w < 0 ? -1 : 1
      _torque.x += 2 * _q.x * sign * physics.rotStiffness * b.inertia
      _torque.y += 2 * _q.y * sign * physics.rotStiffness * b.inertia
      _torque.z += 2 * _q.z * sign * physics.rotStiffness * b.inertia

      b.velocity.addScaledVector(_force, dt / b.mass).multiplyScalar(linDamp)
      b.angular.addScaledVector(_torque, dt / b.inertia).multiplyScalar(angDamp)
      b.position.addScaledVector(b.velocity, dt)

      // q += ½ ω q dt
      _wq.set(b.angular.x, b.angular.y, b.angular.z, 0).multiply(b.rotation)
      b.rotation.x += 0.5 * _wq.x * dt
      b.rotation.y += 0.5 * _wq.y * dt
      b.rotation.z += 0.5 * _wq.z * dt
      b.rotation.w += 0.5 * _wq.w * dt
      b.rotation.normalize()
    }

    if (this.collisions && physics.collisions) this.collide()
  }

  /** Soft sphere collisions within a layer: mass-weighted separation + nearly inelastic impulse. */
  private collide() {
    const { collisionScale, collisionSoftness, restitution } = this.params.physics
    const bodies = this.bodies
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]!
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]!
        if (a.layer !== b.layer) continue
        const minDist = (a.radius + b.radius) * collisionScale
        _d.subVectors(b.position, a.position)
        const distSq = _d.lengthSq()
        if (distSq >= minDist * minDist || distSq < 1e-8) continue
        const dist = Math.sqrt(distSq)
        _d.multiplyScalar(1 / dist) // normal a → b
        const invA = 1 / a.mass
        const invB = 1 / b.mass
        const invSum = invA + invB
        const correction = ((minDist - dist) * collisionSoftness) / invSum
        a.position.addScaledVector(_d, -correction * invA)
        b.position.addScaledVector(_d, correction * invB)
        const vn = (b.velocity.x - a.velocity.x) * _d.x + (b.velocity.y - a.velocity.y) * _d.y + (b.velocity.z - a.velocity.z) * _d.z
        if (vn < 0) {
          const impulse = (-(1 + restitution) * vn) / invSum
          a.velocity.addScaledVector(_d, -impulse * invA)
          b.velocity.addScaledVector(_d, impulse * invB)
        }
      }
    }
  }
}
