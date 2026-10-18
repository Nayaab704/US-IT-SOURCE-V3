// Night atmosphere — pass 1 (reduced resolution, linear HDR out).
// Fog density + analytic light volumes scattering through it. Tone mapping, vignette,
// dither and grain happen in atmosphere-composite.frag at full resolution.

uniform float uAspect;
uniform float uScroll;

uniform vec3 uBaseTop;      // linear, pre-inverted through ACES (see aces.ts)
uniform vec3 uBaseBottom;
uniform float uBaseVariation;

uniform float uFogScale;
uniform float uFogStretch; // < 1 widens features horizontally: fog lies in banks, not columns
uniform float uFogDensity;
uniform float uFogContrast;
uniform float uFogWarp;
uniform float uFogAmbient;
uniform int uOctaves;
uniform vec3 uFogOffset;    // accumulated drift (xy) + evolution (z) — CPU-integrated, never loops
uniform vec3 uNearOffset;
uniform float uNearAmount;
uniform float uNearScale;

uniform vec2 uKeyPos;
uniform vec3 uKeyColor;
uniform float uKeyRadius;
uniform float uKeyIntensity;
uniform vec2 uFillPos;
uniform vec3 uFillColor;
uniform float uFillRadius;
uniform float uFillIntensity;
uniform vec2 uAccentPos;
uniform vec3 uAccentColor;
uniform float uAccentRadius;
uniform float uAccentIntensity;

uniform float uScatterFog;
uniform float uScatterAir;
uniform float uHalo;
uniform float uFalloff;

uniform float uShafts;      // 0 = off
uniform int uShaftSteps;
uniform float uShaftLength;

uniform vec2 uScrollShift;
uniform vec3 uScrollTint;

uniform vec2 uStirPos;      // aspect space
uniform vec2 uStirVec;
uniform float uStirRadius;

varying vec2 vUv;

#include "noise.glsl"

// Far layer (lit, structured) and near layer (dark foreground wisps), both 0–1.
vec2 fogLayers(vec2 q) {
  q *= vec2(uFogStretch, 1.0);
  vec3 p = vec3(q * uFogScale, 0.0) + uFogOffset;
  // Low-frequency warp field: bends the drift so it billows instead of sliding like a texture.
  vec2 w = vec2(
    snoise(p * 0.45 + vec3(0.0, 0.0, 3.1)),
    snoise(p * 0.45 + vec3(5.2, 1.3, 7.7))
  );
  float far = fbm(p + vec3(w * uFogWarp, 0.0), uOctaves);
  vec3 pn = vec3(q * uFogScale * uNearScale, 0.0) + uNearOffset;
  float near = fbm(pn + vec3(w * uFogWarp * 0.6, 0.0), 2);
  // Wide soft thresholds: banks with thinner air between them, but never fully empty —
  // an empty patch under the light reads as a plain gradient.
  far = smoothstep(-0.8, 0.85, far * uFogContrast);
  near = smoothstep(-0.2, 0.85, near * uFogContrast);
  return vec2(far, near);
}

// Exponential distance falloff ≈ light attenuated by the medium itself (not a CSS radial gradient).
float falloff(vec2 q, vec2 lightUv, float radius) {
  vec2 lp = vec2(lightUv.x * uAspect, lightUv.y);
  return exp(-length(q - lp) / max(radius, 1e-3) * uFalloff);
}

float halo(vec2 q, vec2 lightUv, float radius) {
  vec2 lp = vec2(lightUv.x * uAspect, lightUv.y);
  vec2 d = (q - lp) / max(radius, 1e-3);
  return exp(-dot(d, d) * 9.0);
}

// Screen-space shafts: march toward the key light through a cheap density proxy.
// Clear paths let more light through, so beams radiate from the source.
float shaftTransmittance(vec2 q, vec2 lightUv) {
  vec2 lp = vec2(lightUv.x * uAspect, lightUv.y);
  vec2 stepVec = (lp - q) * uShaftLength / float(uShaftSteps);
  vec2 s = q;
  float occ = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= uShaftSteps) break;
    s += stepVec;
    occ += smoothstep(-0.2, 0.6, snoise(vec3(s * vec2(uFogStretch, 1.0) * uFogScale, 0.0) + uFogOffset));
  }
  return exp(-occ / float(uShaftSteps) * 2.5);
}

void main() {
  vec2 q = vec2(vUv.x * uAspect, vUv.y);

  // Pointer stir: displace the fog domain near the cursor along its recent motion.
  vec2 sd = q - uStirPos;
  vec2 qf = q - uStirVec * exp(-dot(sd, sd) / (uStirRadius * uStirRadius));

  vec2 layers = fogLayers(qf);
  float fog = layers.x * uFogDensity;
  float near = layers.y * uNearAmount;

  // Base: night-0 → night-1, leaning toward the key light, with a very slow large-scale breath.
  float g = smoothstep(0.0, 1.0, vUv.y * 0.8 + vUv.x * 0.2);
  vec3 base = mix(uBaseBottom, uBaseTop, g);
  base *= 1.0 + uBaseVariation * snoise(vec3(q * 0.5, uFogOffset.z * 0.5 + 11.0));
  vec3 col = base * (1.0 + fog * uFogAmbient);

  // Key light (scroll moves and tints it slightly).
  vec2 keyPos = uKeyPos + uScrollShift * uScroll;
  vec3 keyColor = uKeyColor * mix(vec3(1.0), uScrollTint, uScroll);
  float keyFall = falloff(q, keyPos, uKeyRadius);
  float scatter = uScatterAir + fog * uScatterFog;
  vec3 key = keyColor * uKeyIntensity * (keyFall * scatter + halo(q, keyPos, uKeyRadius) * uHalo);
  if (uShafts > 0.0) {
    key += keyColor * uKeyIntensity * keyFall * uShafts * shaftTransmittance(qf, keyPos);
  }
  col += key;

  col += uFillColor * uFillIntensity * falloff(q, uFillPos, uFillRadius) * scatter;
  if (uAccentIntensity > 0.0) {
    col += uAccentColor * uAccentIntensity *
      (falloff(q, uAccentPos, uAccentRadius) * scatter + halo(q, uAccentPos, uAccentRadius) * uHalo);
  }

  // Near layer sits in front: it occludes what's behind and catches a little key light on its own.
  col *= 1.0 - near * 0.55;
  col += keyColor * uKeyIntensity * keyFall * near * 0.18;

  gl_FragColor = vec4(col, 1.0);
}
