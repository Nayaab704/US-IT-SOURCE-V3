// Inside (S3): a dust mote — a soft round sprite, additive.
uniform float uIntensity;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float a = 1.0 - smoothstep(0.2, 1.0, dot(c, c));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vec3(a * vAlpha * uIntensity), 1.0);
}
