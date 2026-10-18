// Far piece layer — composited over the atmosphere.
// The layer was rendered at reduced resolution (linear HDR, premultiplied alpha); the smooth
// upscale softens it like depth of field. Dimmed and partly transparent so the real atmosphere
// behind reads as haze. Output is premultiplied sRGB (blend: ONE, ONE_MINUS_SRC_ALPHA).

uniform sampler2D uLayer;
uniform vec2 uLayerSize;
uniform float uExposure;
uniform float uDim;
uniform float uOpacity;

varying vec2 vUv;

#include "tonemap.glsl"
#include "upsample.glsl"

void main() {
  vec4 t = textureBSpline(uLayer, vUv, uLayerSize);
  if (t.a < 0.002) discard;
  // Tone-map the straight colour, then re-premultiply, so soft edges don't darken.
  vec3 straight = t.rgb / t.a;
  vec3 c = linearToSRGB(acesFilmic(straight * uExposure * uDim));
  float a = t.a * uOpacity;
  gl_FragColor = vec4(c * a, a);
}
