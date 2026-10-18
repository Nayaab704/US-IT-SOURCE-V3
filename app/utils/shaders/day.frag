// Day atmosphere — pass 1 (reduced resolution, linear out).
// Paper ground + afternoon window light projected onto it: a soft warm patch crossed by the
// shadow of the window frame (mullions + transom). Penumbra widens with distance from the window.
// Fine paper fibre, grain and dither happen at full resolution in day-composite.frag.

uniform float uAspect;

uniform vec3 uPaper;        // linear — the --paper token, exact
uniform float uTonal;
uniform float uTonalScale;

uniform vec2 uOrigin;       // window entry point, aspect space (incl. drift + parallax)
uniform vec2 uDir;          // direction the light travels
uniform float uLength;
uniform float uWidth;
uniform float uSpread;
uniform float uSkew;
uniform float uScale;       // whole-pattern scale (phones)

uniform vec3 uWarm;         // multiplier at full light (luminance 1 + intensity, warm hue)
uniform float uLight;       // 0–1: light strength now (clouds dim it)
uniform float uMullions;
uniform float uTransom;
uniform float uBar;
uniform vec3 uCool;         // multiplier in full shadow (luminance 1 − strength, cool hue)
uniform float uShadow;      // 0–1: shadow strength now (clouds soften it)
uniform float uPenNear;
uniform float uPenFar;

uniform float uCurtain;     // 0 = off
uniform float uFolds;
uniform float uSwayPhase;

varying vec2 vUv;

#include "noise.glsl"

// 1 inside a bar of half-width h centred at c, with soft edges of width pen on each side.
float bar(float x, float c, float h, float pen) {
  return 1.0 - smoothstep(h - pen, h + pen, abs(x - c));
}

void main() {
  vec2 q = vec2(vUv.x * uAspect, vUv.y);

  // Paper: exact token × a very slow tonal variation (the paper itself doesn't move).
  float tonal = 1.0 + uTonal * fbm(vec3(q * uTonalScale * 2.0, 3.7), 2);
  vec3 col = uPaper * tonal;

  // Window space: v runs along the light (0 at the window, 1 at the far end of the patch),
  // u across it (0–1). The patch widens with distance (perspective) and the bars shear (low sun).
  float L = uLength * uScale;
  float W = uWidth * uScale;
  vec2 d = q - uOrigin;
  vec2 perp = vec2(-uDir.y, uDir.x);
  float along = dot(d, uDir);
  float v = along / L;
  float halfW = 0.5 * W * (1.0 + uSpread * max(v, 0.0));
  float u = (dot(d, perp) - uSkew * along) / (2.0 * halfW) + 0.5;

  // Penumbra: sharp near the window, very soft far from it.
  float pen = mix(uPenNear, uPenFar, clamp(v, 0.0, 1.0)) * uScale;
  float penU = pen / (2.0 * halfW);
  float penV = pen / L;

  // The patch's outer edge is a little softer than the bars (light spills around the reveal).
  float aperture = smoothstep(-1.5 * penU, 1.5 * penU, u) * smoothstep(-1.5 * penU, 1.5 * penU, 1.0 - u)
                 * smoothstep(-1.5 * penV, 1.5 * penV, v) * smoothstep(-1.5 * penV, 1.5 * penV, 1.0 - v);

  float bars = 0.0;
  for (int k = 1; k <= 3; k++) {
    if (float(k) > uMullions) break;
    bars = max(bars, bar(u, float(k) / (uMullions + 1.0), 0.5 * uBar, penU));
  }
  // Transom: same physical thickness as the mullions, measured along the light.
  bars = max(bars, bar(v, uTransom, 0.5 * uBar * W / L, penV));

  // Light is a touch stronger near the window.
  float lit = aperture * (1.0 - bars) * (1.0 - 0.25 * clamp(v, 0.0, 1.0));
  if (uCurtain > 0.0) {
    float folds = sin(u * uFolds * 6.2831853 + uSwayPhase + 0.8 * snoise(vec3(u * 3.0, v * 0.7, uSwayPhase * 0.1)));
    lit *= 1.0 + uCurtain * folds;
  }
  float shade = aperture * bars;

  col *= mix(vec3(1.0), uWarm, lit * uLight);
  col *= mix(vec3(1.0), uCool, shade * uShadow);
  gl_FragColor = vec4(col, 1.0);
}
