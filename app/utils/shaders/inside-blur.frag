// Inside (S3) post: separable 9-tap Gaussian (bloom).
uniform sampler2D tSource;
uniform vec2 uDirection;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tSource, vUv) * 0.227027;
  c += (texture2D(tSource, vUv + uDirection * 1.3846153846) + texture2D(tSource, vUv - uDirection * 1.3846153846)) * 0.3162162162;
  c += (texture2D(tSource, vUv + uDirection * 3.2307692308) + texture2D(tSource, vUv - uDirection * 3.2307692308)) * 0.0702702703;
  gl_FragColor = c;
}
