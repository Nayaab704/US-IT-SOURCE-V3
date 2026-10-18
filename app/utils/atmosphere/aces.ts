// CPU twin of utils/shaders/tonemap.glsl → acesFilmic(). Must stay numerically identical.
export type RGB = [number, number, number]

// Column-major, like GLSL mat3(col0, col1, col2).
const IN: RGB[] = [
  [0.59719, 0.076, 0.0284],
  [0.35458, 0.90834, 0.13383],
  [0.04823, 0.01566, 0.83777],
]
const OUT: RGB[] = [
  [1.60475, -0.10208, -0.00327],
  [-0.53108, 1.10813, -0.07276],
  [-0.07367, -0.00605, 1.07602],
]

function mul(m: RGB[], v: RGB): RGB {
  return [
    m[0]![0] * v[0] + m[1]![0] * v[1] + m[2]![0] * v[2],
    m[0]![1] * v[0] + m[1]![1] * v[1] + m[2]![1] * v[2],
    m[0]![2] * v[0] + m[1]![2] * v[1] + m[2]![2] * v[2],
  ]
}

const fit = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function acesFilmic(c: RGB): RGB {
  const a = mul(IN, [c[0] / 0.6, c[1] / 0.6, c[2] / 0.6])
  const b = mul(OUT, [fit(a[0]), fit(a[1]), fit(a[2])])
  return [clamp01(b[0]), clamp01(b[1]), clamp01(b[2])]
}

function invert3(m: RGB[]): RGB[] {
  const [a, b, c] = [m[0]!, m[1]!, m[2]!] // columns
  // Rows of the inverse = cross products of columns / determinant.
  const r0 = [b[1] * c[2] - b[2] * c[1], b[2] * c[0] - b[0] * c[2], b[0] * c[1] - b[1] * c[0]]
  const r1 = [c[1] * a[2] - c[2] * a[1], c[2] * a[0] - c[0] * a[2], c[0] * a[1] - c[1] * a[0]]
  const r2 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const det = a[0] * r0[0]! + a[1] * r0[1]! + a[2] * r0[2]!
  // Back to column-major.
  return [
    [r0[0]! / det, r1[0]! / det, r2[0]! / det],
    [r0[1]! / det, r1[1]! / det, r2[1]! / det],
    [r0[2]! / det, r1[2]! / det, r2[2]! / det],
  ]
}
const IN_INV = invert3(IN)
const OUT_INV = invert3(OUT)

// fit(v) = y solved for v: (1 − yC)v² + (A − yD)v − (B + yE) = 0, positive root.
function fitInverse(y: number) {
  const A = 0.0245786
  const B = 0.000090537
  const C = 0.983729
  const D = 0.432951
  const E = 0.238081
  const qa = 1 - y * C
  const qb = A - y * D
  const qc = -(B + y * E)
  return (-qb + Math.sqrt(qb * qb - 4 * qa * qc)) / (2 * qa)
}

/**
 * Linear HDR input that ACES maps to `target` (linear display value) — exact closed-form inverse.
 * Why: ACES' toe crushes our darkest tokens (--night-0) to pure black and shifts dark blues.
 * Feeding the shader pre-inverted base colours makes the unlit background land on the token colours.
 * Negative components (target outside what ACES can produce) are clamped to 0.
 */
export function inverseAces(target: RGB): RGB {
  const a = mul(OUT_INV, target)
  const v = mul(IN_INV, [fitInverse(a[0]), fitInverse(a[1]), fitInverse(a[2])])
  return [Math.max(0, v[0] * 0.6), Math.max(0, v[1] * 0.6), Math.max(0, v[2] * 0.6)]
}
