// The line: flat ink-blue with soft, matte dimensional shading — the side facing the key light (and
// so the bends that turn toward it) reads slightly lighter. No specular, no glow.
uniform vec3 uColor;   // linear
uniform float uShade;
uniform float uTail;   // visible window along the path (px of arc length)
uniform float uHead;
uniform float uClip;   // 0 for the end caps (spheres have no arc)

varying float vArc;
varying vec3 vNormalV;

void main() {
  if (uClip > 0.5 && (vArc < uTail || vArc > uHead)) discard;
  vec3 n = normalize(vNormalV);
  vec3 key = normalize(vec3(-0.45, 0.6, 0.65));
  // Wrapped Lambert: soft terminator, never black.
  float l = clamp((dot(n, key) + 0.6) / 1.6, 0.0, 1.0);
  vec3 c = uColor * (1.0 - uShade * 0.55 + uShade * l);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
