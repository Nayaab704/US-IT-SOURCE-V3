// A thin band of light travelling left → right, mostly on bevels and seams (not a glow on the faces).

uniform float uX;
uniform float uWidth;
uniform float uIntensity;
uniform float uFaces;
uniform vec3 uColor;

varying float vWorldX;
varying float vEdge;

void main() {
  float d = (vWorldX - uX) / max(uWidth, 1e-3);
  float band = exp(-d * d);
  float edge = mix(uFaces, 1.0, smoothstep(0.15, 0.6, vEdge));
  gl_FragColor = vec4(uColor * band * edge * uIntensity, 1.0);
}
