// /about night line: the void, with the reduced-resolution lacquer shapes upsampled (soft) and tone
// mapped over it, only inside the section's rect (elsewhere: nothing, the page shows).
uniform sampler2D tShapes;
uniform vec2 uSize;     // shapes target size (px)
uniform vec4 uRect;     // section rect in drawing-buffer px (x, y from bottom, w, h)
uniform vec3 uVoid;     // linear
uniform float uStrength;
uniform float uExposure;
uniform float uGrain;
uniform float uFrame;
varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"
#include "upsample.glsl"

void main() {
  vec2 px = gl_FragCoord.xy;
  if (px.x < uRect.x || px.y < uRect.y || px.x > uRect.x + uRect.z || px.y > uRect.y + uRect.w) discard;
  // The target is cleared transparent: soft edges come out premultiplied — un-premultiply before
  // tone mapping, then lay the shapes over the void by their coverage.
  vec4 s = textureBSpline(tShapes, vUv, uSize);
  float a = clamp(s.a, 0.0, 1.0);
  vec3 lin = a > 1e-4 ? s.rgb / a : vec3(0.0);
  vec3 shapes = linearToSRGB(agxFilmic(lin * uExposure));
  vec3 c = mix(linearToSRGB(uVoid), shapes, a * uStrength);
  c = filmGrain(c, px, fract(uFrame * 0.618) * 97.0, uGrain);
  c = dither8bit(c, px, uFrame);
  gl_FragColor = vec4(c, 1.0);
}
