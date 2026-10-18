// Night atmosphere — pass 2 (full resolution).
// Smooth B-spline upscale of the HDR fog pass → vignette → ACES → sRGB → dither + grain.
// Dither and grain run at full resolution so they stay pixel-fine regardless of internal scale.

uniform sampler2D uScene;
uniform vec2 uSceneSize;
uniform float uAspect;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uDither;
uniform float uFrame;

varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"
#include "upsample.glsl"

void main() {
  vec3 hdr = textureBSpline(uScene, vUv, uSceneSize).rgb;

  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(v) / length(vec2(uAspect, 1.0) * 0.5);
  hdr *= 1.0 - uVignette * smoothstep(0.3, 1.05, r);

  vec3 c = linearToSRGB(acesFilmic(hdr * uExposure));
  c = filmGrain(c, gl_FragCoord.xy, uGrainSeed, uGrain);
  if (uDither > 0.5) c = dither8bit(c, gl_FragCoord.xy, uFrame);

  gl_FragColor = vec4(c, 1.0);
}
