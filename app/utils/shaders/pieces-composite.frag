// Out-of-focus pieces, blended over the sharp pieces (already drawn to the canvas).
// A soft low-res copy and a per-pixel blur amount (CoC from real depth): where k > 0 the soft copy
// replaces the sharp one, dimmed and partly transparent so the fog reads as haze. As a piece travels
// to the focus plane its CoC falls to 0 and it arrives sharp — no switching.
// Inputs are linear HDR, premultiplied; output is premultiplied sRGB (blend ONE, ONE_MINUS_SRC_ALPHA).

uniform sampler2D uBlur;
uniform vec2 uBlurSize;
uniform sampler2D uCoc;
uniform vec2 uCocSize;
uniform float uExposure;
uniform float uFarDim;
uniform float uFarOpacity;

varying vec2 vUv;

#include "tonemap.glsl"
#include "upsample.glsl"

void main() {
  float k = clamp(textureBSpline(uCoc, vUv, uCocSize).r, 0.0, 1.0);
  if (k < 0.002) discard; // in focus (or empty): the sharp pieces underneath stand
  vec4 c = textureBSpline(uBlur, vUv, uBlurSize);
  if (c.a < 0.002) discard;
  // Tone-map the straight colour, then re-premultiply, so soft edges don't darken.
  vec3 straight = c.rgb / c.a * uFarDim;
  vec3 col = linearToSRGB(acesFilmic(straight * uExposure));
  float a = c.a * uFarOpacity * k;
  gl_FragColor = vec4(col * a, a);
}
