// Ribbon — the void behind the lacquer, drawn straight to the canvas first (--void, top a hair
// lighter; grain + dither only). No fog, no glow, no gradients beyond the imperceptible lift.
uniform vec3 uVoid; // linear
uniform float uVoidFalloff;
uniform float uGrain;
uniform float uGrainSeed;
uniform float uDither;
uniform float uFrame;

varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"

void main() {
  vec3 c = linearToSRGB(uVoid * (1.0 + uVoidFalloff * vUv.y));
  c = filmGrain(c, gl_FragCoord.xy, uGrainSeed, uGrain);
  if (uDither > 0.5) c = dither8bit(c, gl_FragCoord.xy, uFrame);
  gl_FragColor = vec4(c, 1.0);
}
