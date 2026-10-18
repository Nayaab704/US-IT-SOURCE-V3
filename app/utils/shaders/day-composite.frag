// Day atmosphere — pass 2 (full resolution).
// Smooth upscale of the light pass → fine paper fibre (CSS-px scale) → sRGB → grain → dither.
// No tone mapping in the day world: the unlit paper lands exactly on --paper.
// uOpacity is the world weight: the day fades in over the night during a crossfade.

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

varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"
#include "upsample.glsl"
#include "paper.glsl"

void main() {
  vec3 lin = textureBSpline(uScene, vUv, uSceneSize).rgb;
  lin *= 1.0 + uFibre * paperFibre(gl_FragCoord.xy / uDpr / max(uFibreScale, 0.05));
  vec3 c = linearToSRGB(lin);
  c = filmGrain(c, gl_FragCoord.xy, uGrainSeed, uGrain);
  if (uDither > 0.5) c = dither8bit(c, gl_FragCoord.xy, uFrame);
  gl_FragColor = vec4(c, uOpacity);
}
