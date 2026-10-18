// Fine paper texture, evaluated at full resolution in CSS pixels (so it looks the same at any DPR).
// Cheap hash/value noise — no textures. Returns roughly −1 … 1, mean ~0.

float paperHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = paperHash(i);
  float b = paperHash(i + vec2(1.0, 0.0));
  float c = paperHash(i + vec2(0.0, 1.0));
  float d = paperHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/**
 * Short pressed fibres in two loose directions + a little speckle + soft cloudy formation.
 * `px` is the position in CSS px, already divided by the fibre scale.
 */
float paperFibre(vec2 px) {
  const mat2 R1 = mat2(0.866, 0.5, -0.5, 0.866);   // +30°
  const mat2 R2 = mat2(0.866, -0.5, 0.5, 0.866);   // −30°
  float f1 = valueNoise((R1 * px) * vec2(0.06, 0.55));
  float f2 = valueNoise((R2 * px) * vec2(0.05, 0.5) + 17.3);
  float speck = paperHash(floor(px * 0.7));
  float cloud = valueNoise(px * 0.018 + 4.1);
  return (f1 + f2 - 1.0) * 0.7 + (speck - 0.5) * 0.35 + (cloud - 0.5) * 0.6;
}
