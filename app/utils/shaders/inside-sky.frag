// Inside (S3): the sky — a pure greyscale gradient by the view ray's elevation (no colour, no glow).
uniform mat4 uInvViewProj;

varying vec2 vUv;

#include "inside-common.glsl"

void main() {
  vec4 p = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(p.xyz / p.w - uCamPos);
  gl_FragColor = vec4(skyColor(dir), 1.0);
}
