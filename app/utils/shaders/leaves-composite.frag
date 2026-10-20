// Sunlight through leaves (F3): upsample the pattern (B-spline, soft) + fine grain, inside the
// section's rect only; outside it is white (neutral under multiply).
uniform sampler2D tLight;
uniform vec2 uSize;     // pattern target size (px)
uniform float uGrain;
uniform float uFrame;
uniform vec4 uRect;   // section rect in drawing-buffer px (x, y from bottom, w, h)
varying vec2 vUv;

#include "dither.glsl"
#include "upsample.glsl"

void main() {
  vec2 px = gl_FragCoord.xy;
  if (px.x < uRect.x || px.y < uRect.y || px.x > uRect.x + uRect.z || px.y > uRect.y + uRect.w) {
    gl_FragColor = vec4(1.0);
    return;
  }
  vec3 c = textureBSpline(tLight, vUv, uSize).rgb;
  float g = (hash12(px + fract(uFrame * 0.618) * 97.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(c + g, 0.0, 1.0), 1.0);
}
