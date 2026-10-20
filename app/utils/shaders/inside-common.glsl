// Inside (S3): shared sky gradient and height fog. Everything linear HDR; the post
// pass tone-maps and grades to monochrome.
uniform vec3 uFogTop;      // linear
uniform vec3 uFogHorizon;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform vec3 uCamPos;

vec3 skyColor(vec3 dir) {
  float t = smoothstep(-0.03, 0.42, dir.y);
  return mix(uFogHorizon, uFogTop, t);
}

// Exponential fog, thinner with height (dense along the horizon, clear near the camera).
vec3 applyFog(vec3 col, vec3 worldPos) {
  vec3 d = worldPos - uCamPos;
  float dist = length(d);
  float h = max(0.0, mix(uCamPos.y, worldPos.y, 0.5));
  float amount = 1.0 - exp(-uFogDensity * dist * exp(-uFogFalloff * h));
  return mix(col, skyColor(d / max(dist, 1e-4)), clamp(amount, 0.0, 1.0));
}
