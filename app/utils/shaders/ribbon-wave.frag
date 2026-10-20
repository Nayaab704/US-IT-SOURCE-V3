// Ribbon liquid surface — one step of a damped wave equation on a height field in the ribbon's UV
// space (u along the path, clamped; v around the perimeter, wrapped by the texture's RepeatWrapping).
// State: r = height, g = vertical velocity. Units are world units, so waves travel at the same
// speed along and across the ribbon.
uniform sampler2D tState;
uniform vec2 uTexel;     // 1 / grid size
uniform vec2 uCell;      // world size of one cell (du, dv)
uniform vec2 uExtent;    // world length of the path, perimeter of the cross-section
uniform float uDt;
uniform float uSpeed;
uniform float uDamping;
uniform float uViscosity;
uniform float uRestore;
// Cursor stroke this step: from hit A to hit B (uv); strength, radius (world).
uniform vec4 uStroke;
uniform vec4 uImpulse;

varying vec2 vUv;

void main() {
  vec4 s = texture2D(tState, vUv);
  vec4 l = texture2D(tState, vUv - vec2(uTexel.x, 0.0));
  vec4 r = texture2D(tState, vUv + vec2(uTexel.x, 0.0));
  vec4 d = texture2D(tState, vUv - vec2(0.0, uTexel.y));
  vec4 u = texture2D(tState, vUv + vec2(0.0, uTexel.y));
  vec2 ic = 1.0 / (uCell * uCell);
  float lapH = (l.r + r.r - 2.0 * s.r) * ic.x + (d.r + u.r - 2.0 * s.r) * ic.y;
  float lapV = (l.g + r.g - 2.0 * s.g) * ic.x + (d.g + u.g - 2.0 * s.g) * ic.y;

  // Soft reflection at the two ends of the path: extra damping in the last few % of u.
  float edge = smoothstep(0.0, 0.04, min(vUv.x, 1.0 - vUv.x));
  float damping = uDamping + (1.0 - edge) * 6.0;

  float h = s.r;
  float v = s.g;
  // Viscosity (ν∇²v) damps short wavelengths faster than long ones: the surface settles smoothly.
  v += uDt * (uSpeed * uSpeed * lapH - damping * v + uViscosity * lapV);

  // Cursor impulse: a capsule from the previous hit to this one (fast swipes leave a trail).
  if (uImpulse.x != 0.0) {
    vec2 p = vUv * uExtent;
    vec2 a = uStroke.xy * uExtent;
    vec2 ba = (uStroke.zw - uStroke.xy) * uExtent;
    vec2 pa = p - a;
    // Shortest way round the perimeter.
    pa.y -= uExtent.y * floor(pa.y / uExtent.y + 0.5);
    ba.y -= uExtent.y * floor(ba.y / uExtent.y + 0.5);
    float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    vec2 q = pa - ba * t;
    // Pressing in (negative).
    v -= uImpulse.x * exp(-dot(q, q) / (uImpulse.y * uImpulse.y));
  }

  h += uDt * v;
  h -= uDt * uRestore * h;
  gl_FragColor = vec4(h, v, 0.0, 0.0);
}
