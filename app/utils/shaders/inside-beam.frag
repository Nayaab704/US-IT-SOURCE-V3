// Inside (S3): additive light column. Bright where the cylinder faces the viewer (its core), soft at
// its silhouette; a slow vertical noise flicker; fades out toward the top and at the very base.
uniform float uIntensity;
uniform float uFalloff;   // higher = tighter core
uniform float uTime;

varying vec3 vWorld;
varying vec3 vNormalW;
varying float vY;

#include "noise.glsl"
#include "inside-common.glsl"

void main() {
  vec3 V = normalize(uCamPos - vWorld);
  vec3 N = normalize(vNormalW);
  float facing = abs(dot(N, V));
  float core = pow(facing, uFalloff);
  float flicker = 0.82 + 0.18 * snoise(vec3(vWorld.y * 0.02, uTime * 0.25, 1.7));
  float vertical = smoothstep(0.0, 0.03, vY) * (1.0 - smoothstep(0.55, 1.0, vY));
  float a = core * flicker * vertical * uIntensity;
  // Fog dims the far column (but the light stays bright through it).
  vec3 col = vec3(a);
  float dist = length(vWorld - uCamPos);
  col *= exp(-uFogDensity * 0.35 * dist);
  gl_FragColor = vec4(col, 1.0);
}
