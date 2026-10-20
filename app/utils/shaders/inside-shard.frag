// Inside (S3): dark glass — strong fresnel rim and sharp white glints from the beam and a key light;
// glints twinkle as facets turn. Fogged with distance.
uniform float uGlint;
uniform float uTime;

varying vec3 vWorld;
varying vec3 vNormalW;
varying float vSeed;
varying float vKeep;

#include "inside-common.glsl"
#include "dither.glsl"

uniform vec3 uBeamBase;

void main() {
  // Dithered crossfade with the bokeh disc (near camera).
  if (hash12(gl_FragCoord.xy + vSeed * 97.0) > vKeep) discard;
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(uCamPos - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  vec3 col = vec3(0.012) + fres * mix(uFogHorizon, vec3(0.5), 0.5) * 0.9;
  // Glints: the beam (horizontal direction to the column at the shard's height) and a high key.
  vec3 Lb = normalize(vec3(uBeamBase.x, vWorld.y, uBeamBase.z) - vWorld);
  vec3 Lk = normalize(vec3(-0.3, 0.9, 0.35));
  float sb = pow(max(dot(reflect(-Lb, N), V), 0.0), 90.0);
  float sk = pow(max(dot(reflect(-Lk, N), V), 0.0), 140.0);
  float twinkle = 0.6 + 0.4 * sin(uTime * 2.3 + vSeed * 40.0);
  col += vec3((sb * 7.0 + sk * 4.0) * uGlint * twinkle);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}
