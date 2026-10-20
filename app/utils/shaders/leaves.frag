// Sunlight through leaves (F3): a multiply layer — 1 = untouched. Two layers of domain-warped noise
// thresholded into leaf clusters (soft penumbra, softer for the farther layer) over warm sun gaps.
uniform float uTime;
uniform float uAspect;
uniform float uScale;
uniform float uCoverage;
uniform float uPenumbra;
uniform float uPenumbraFar;
uniform float uSway;
uniform float uSwayPeriod;
uniform float uSwayPeriod2;
uniform float uDrift;
uniform float uScroll;      // section scroll offset (screen heights): the pattern stays on the page
uniform float uShadow;
uniform vec3 uShadowTint;   // display multiplier
uniform float uLight;
uniform vec3 uLightTint;    // display multiplier
varying vec2 vUv;

#include "noise.glsl"

float leafLayer(vec2 p, float t, float pen, float seed) {
  // Domain warp: clusters of leaves, not blobs.
  vec2 w = vec2(snoise(vec3(p * 0.7, seed + t * 0.03)), snoise(vec3(p * 0.7 + 7.3, seed - t * 0.03)));
  float f = fbm(vec3(p * 1.6 + w * 0.3, seed + t * 0.02), 3) * 0.5 + 0.5;
  return smoothstep(uCoverage - pen, uCoverage + pen, f);
}

void main() {
  float t = uTime;
  vec2 p = vec2(vUv.x * uAspect, vUv.y + uScroll) / uScale;
  float tau = 6.2831853;
  // Gentle sway (two slow, incommensurate periods) and a slow drift.
  vec2 sway = vec2(sin(t * tau / uSwayPeriod), cos(t * tau / uSwayPeriod2)) * uSway / uScale;
  vec2 drift = vec2(1.0, 0.35) * t * uDrift / uScale;
  float nearL = leafLayer(p + sway + drift, t, uPenumbra, 1.7);
  float farL = leafLayer(p * 1.35 + sway * 0.6 + drift * 0.8 + 3.1, t * 0.8, uPenumbraFar, 4.2);
  float leaf = max(nearL, farL * 0.7);
  // Sun gaps: brighter where no leaf, with soft round dapples.
  float dapple = smoothstep(0.45, 0.8, snoise(vec3(p * 4.0 + sway * 2.0, t * 0.05)) * 0.5 + 0.5);
  float sun = (1.0 - leaf) * (0.55 + 0.45 * dapple);
  vec3 lit = mix(vec3(1.0), uLightTint, uLight * sun);
  vec3 shade = mix(vec3(1.0), uShadowTint, clamp(leaf * uShadow, 0.0, 1.0));
  gl_FragColor = vec4(lit * shade, 1.0);
}
