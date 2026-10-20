// Inside (S3): a soft out-of-focus disc with a faint brighter rim (lens bokeh), additive.
uniform float uStrength;
varying vec2 vLocal;
varying float vAlpha;

void main() {
  float d = length(vLocal);
  if (d > 1.0) discard;
  float disc = 1.0 - smoothstep(0.75, 1.0, d);
  float rim = smoothstep(0.6, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d));
  float a = (disc * 0.16 + rim * 0.22) * vAlpha * uStrength;
  gl_FragColor = vec4(vec3(a), 1.0);
}
