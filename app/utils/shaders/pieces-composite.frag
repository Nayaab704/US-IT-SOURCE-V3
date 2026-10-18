// Out-of-focus pieces, blended over the sharp pieces (already drawn to the canvas).
// A soft low-res copy and a per-pixel blur amount (CoC from real depth / the exit's radial falloff):
// where k > 0 the soft copy replaces the sharp one, dimmed and partly transparent so the fog reads
// as haze. As a piece reaches focus its CoC falls to 0 and it arrives sharp — no switching.
// Optional zoom blur (hero exit): the soft layer is smeared radially toward the counter.
// Inputs are linear HDR, premultiplied; output is premultiplied sRGB (blend ONE, ONE_MINUS_SRC_ALPHA).

uniform sampler2D uBlur;
uniform vec2 uBlurSize;
uniform sampler2D uCoc;
uniform vec2 uCocSize;
uniform float uExposure;
uniform float uFarDim;
uniform float uFarOpacity;
uniform vec2 uZoomCenter;   // uv
uniform float uZoomAmount;  // sample spread (fraction of the screen)

varying vec2 vUv;

#include "tonemap.glsl"
#include "upsample.glsl"

const int ZOOM_TAPS = 8;

void main() {
  float k;
  vec4 c;
  if (uZoomAmount > 0.0005) {
    // Radial smear along the line to the counter (plain bilinear taps — it's already soft).
    vec2 dir = (vUv - uZoomCenter) * uZoomAmount;
    k = 0.0;
    c = vec4(0.0);
    for (int i = 0; i < ZOOM_TAPS; i++) {
      vec2 uv = vUv - dir * (float(i) / float(ZOOM_TAPS - 1));
      k += texture2D(uCoc, uv).r;
      c += texture2D(uBlur, uv);
    }
    k = clamp(k / float(ZOOM_TAPS), 0.0, 1.0);
    c /= float(ZOOM_TAPS);
  } else {
    k = clamp(textureBSpline(uCoc, vUv, uCocSize).r, 0.0, 1.0);
    c = vec4(0.0);
  }
  if (k < 0.002) discard; // in focus (or empty): the sharp pieces underneath stand
  if (uZoomAmount <= 0.0005) c = textureBSpline(uBlur, vUv, uBlurSize);
  if (c.a < 0.002) discard;
  // Tone-map the straight colour, then re-premultiply, so soft edges don't darken.
  vec3 straight = c.rgb / c.a * uFarDim;
  vec3 col = linearToSRGB(acesFilmic(straight * uExposure));
  float a = c.a * uFarOpacity * k;
  gl_FragColor = vec4(col * a, a);
}
