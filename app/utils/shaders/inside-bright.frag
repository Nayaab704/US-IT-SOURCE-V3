// Inside (S3) post: half-res bright pass — only the beam core and the strongest glints survive.
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;

void main() {
  vec3 c = texture2D(tSource, vUv + uTexel * vec2(-0.5, -0.5)).rgb;
  c += texture2D(tSource, vUv + uTexel * vec2(0.5, -0.5)).rgb;
  c += texture2D(tSource, vUv + uTexel * vec2(-0.5, 0.5)).rgb;
  c += texture2D(tSource, vUv + uTexel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * max(l - uThreshold, 0.0) / max(l, 1e-4), 1.0);
}
