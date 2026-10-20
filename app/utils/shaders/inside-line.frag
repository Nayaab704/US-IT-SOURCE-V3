// Inside (S3): a thin white line with a faint glow (HDR, so the bloom catches it); revealed up to uHead.
uniform float uHead;
uniform float uGlow;

varying float vArc;
varying vec3 vWorld;
varying vec3 vNormalW;

#include "inside-common.glsl"

void main() {
  if (vArc > uHead) discard;
  vec3 V = normalize(uCamPos - vWorld);
  float facing = abs(dot(normalize(vNormalW), V));
  vec3 col = vec3(0.55 + 0.45 * facing) * uGlow;
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}
