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

vec4 bsplineWeights(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}

// Cubic B-spline in 4 bilinear taps: no bilinear "diamond" artefacts when upscaling 1.5–2×.
vec3 textureBSpline(sampler2D tex, vec2 uv, vec2 size) {
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = bsplineWeights(f.x);
  vec4 yc = bsplineWeights(f.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 o = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec3 s0 = texture2D(tex, o.xz).rgb;
  vec3 s1 = texture2D(tex, o.yz).rgb;
  vec3 s2 = texture2D(tex, o.xw).rgb;
  vec3 s3 = texture2D(tex, o.yw).rgb;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

void main() {
  vec3 hdr = textureBSpline(uScene, vUv, uSceneSize);

  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(v) / length(vec2(uAspect, 1.0) * 0.5);
  hdr *= 1.0 - uVignette * smoothstep(0.3, 1.05, r);

  vec3 c = linearToSRGB(acesFilmic(hdr * uExposure));
  c = filmGrain(c, gl_FragCoord.xy, uGrainSeed, uGrain);
  if (uDither > 0.5) c = dither8bit(c, gl_FragCoord.xy, uFrame);

  gl_FragColor = vec4(c, 1.0);
}
