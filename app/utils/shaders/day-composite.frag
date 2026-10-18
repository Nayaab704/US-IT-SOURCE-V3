// Day atmosphere — pass 2 (full resolution).
// Smooth upscale of the light pass → fine paper fibre (CSS-px scale) → sRGB → grain → dither.
// No tone mapping in the day world: the unlit paper lands exactly on --paper.
//
// Opacity: the world weight (Phase 6 crossfade) and/or an APERTURE — a feathered screen circle
// (the hero's O counter) through which the day shows while the world is still night, plus a faint
// warm glow on its rim while it opens. Per pixel alpha = max(circle × intensity, world weight).

uniform sampler2D uScene;
uniform vec2 uSceneSize;
uniform float uDpr;
uniform float uFibre;
uniform float uFibreScale;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uDither;
uniform float uFrame;
uniform float uOpacity;

uniform float uMask;          // 1 = aperture active
uniform vec2 uMaskCenter;     // drawing-buffer px, origin bottom-left
uniform float uMaskRadius;    // drawing-buffer px
uniform float uMaskFeather;
uniform float uMaskIntensity;
uniform float uBloom;
uniform float uBloomWidth;
uniform vec3 uBloomColor;     // sRGB

varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"
#include "upsample.glsl"
#include "paper.glsl"

void main() {
  float alpha = uOpacity;
  float rim = 0.0;
  if (uMask > 0.5) {
    float dist = length(gl_FragCoord.xy - uMaskCenter);
    float inside = 1.0 - smoothstep(uMaskRadius - uMaskFeather, uMaskRadius + uMaskFeather, dist);
    alpha = max(alpha, inside * uMaskIntensity);
    float x = (dist - uMaskRadius) / max(uBloomWidth, 1.0);
    rim = uBloom * exp(-x * x) * (1.0 - inside);
  }
  if (alpha + rim < 0.002) discard;

  vec3 lin = textureBSpline(uScene, vUv, uSceneSize).rgb;
  lin *= 1.0 + uFibre * paperFibre(gl_FragCoord.xy / uDpr / max(uFibreScale, 0.05));
  vec3 c = linearToSRGB(lin);
  c = filmGrain(c, gl_FragCoord.xy, uGrainSeed, uGrain);
  if (uDither > 0.5) c = dither8bit(c, gl_FragCoord.xy, uFrame);

  // Outside the circle only the warm rim contributes; inside, the day.
  float a = alpha + rim;
  gl_FragColor = vec4((c * alpha + uBloomColor * rim) / a, min(a, 1.0));
}
