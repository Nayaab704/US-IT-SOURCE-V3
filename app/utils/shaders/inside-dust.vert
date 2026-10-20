// Inside (S3): dust in the beam, drifting upward (soft additive sprites).
attribute float aSeed;
uniform float uTime;
uniform float uHeight;
uniform float uPixelRatio;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * (0.8 + aSeed * 1.6), uHeight);
  p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.6;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.35 + aSeed * 0.5) * 300.0 * uPixelRatio / max(-mv.z, 1.0);
  vAlpha = (0.25 + 0.75 * aSeed) * (1.0 - smoothstep(0.6, 1.0, p.y / uHeight));
}
