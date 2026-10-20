// Inside (S3) post: scene + bloom → exposure → AgX → monochrome → vignette → sRGB → grain + dither →
// white-out (into the light) → paper. Output is display-referred (sRGB values).
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uFrame;
uniform float uWhite;   // 0 → 1: bloom to white
uniform float uPaper;   // 0 → 1: white settles into --paper
uniform vec3 uPaperColor; // sRGB
varying vec2 vUv;

#include "tonemap.glsl"
#include "dither.glsl"

void main() {
  vec3 hdr = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloomStrength;
  hdr *= uExposure;
  vec3 c = agxFilmic(hdr);
  // Monochrome grade: pure greyscale.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = vec3(l);
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
  c = linearToSRGB(c);
  c = filmGrain(c, gl_FragCoord.xy, fract(uFrame * 0.618034) * 1000.0, uGrain);
  c = dither8bit(c, gl_FragCoord.xy, uFrame);
  c = mix(c, vec3(1.0), uWhite);
  c = mix(c, uPaperColor, uPaper);
  gl_FragColor = vec4(c, 1.0);
}
