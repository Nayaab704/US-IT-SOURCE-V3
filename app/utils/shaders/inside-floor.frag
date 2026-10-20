// Inside (S3): dark, slightly glossy sand. The beam reflects as a soft streak toward the camera, a
// pool of light gathers at its base, fine grain breaks up the surface; then height fog.
uniform vec3 uBeamBase;     // world
uniform float uBeamIntensity;
uniform float uPoolRadius;
uniform float uPool;
uniform float uRoughness;
uniform float uStreak;
uniform float uGrain;

varying vec3 vWorld;
varying vec3 vNormalW;

#include "inside-common.glsl"
#include "dither.glsl"

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(uCamPos - vWorld);
  // Fine grain (stable in world space).
  float g = hash12(floor(vWorld.xz * 9.0)) - 0.5;
  vec3 albedo = vec3(0.032) * (1.0 + g * uGrain * 6.0);
  // Ambient from the sky (hemisphere), very low.
  vec3 col = albedo * mix(uFogHorizon, uFogTop, 0.5) * (0.6 + 0.4 * N.y) * 2.2;
  // The beam as a light: soft Blinn-Phong highlight → a long streak on the glossy floor.
  vec3 lightPos = uBeamBase + vec3(0.0, 40.0, 0.0);
  vec3 L = normalize(lightPos - vWorld);
  vec3 H = normalize(L + V);
  float shininess = mix(220.0, 8.0, uRoughness);
  float spec = pow(max(dot(N, H), 0.0), shininess) * (shininess + 8.0) / 25.0;
  col += vec3(spec * uStreak * uBeamIntensity * 0.06);
  // Pool of light around the base.
  float d = length(vWorld.xz - uBeamBase.xz);
  col += vec3(exp(-(d * d) / (uPoolRadius * uPoolRadius)) * uPool);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}
