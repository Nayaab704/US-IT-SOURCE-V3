// Anti-banding + grain helpers. All operate in display (sRGB, 0–1) space, after tone mapping.

// Interleaved gradient noise (Jimenez 2014): blue-ish distribution, no texture needed.
float ign(vec2 px) {
  return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
}

// Dave Hoskins' hash without sine — stable across GPUs.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/**
 * ±1 LSB triangular dither: two decorrelated uniforms summed, so quantisation error
 * is noise-shaped and independent of signal — no visible steps in an 8-bit dark gradient.
 * `frame` animates the pattern (IGN golden-ratio offset) so it averages out over time.
 */
vec3 dither8bit(vec3 c, vec2 px, float frame) {
  float a = ign(px + 5.588238 * mod(frame, 64.0));
  float b = hash12(px + frame * 17.17);
  return c + (a + b - 1.0) / 255.0;
}

/** Fine luminance grain, strongest in mid-tones (like film), centred on zero. */
vec3 filmGrain(vec3 c, vec2 px, float seed, float amount) {
  float n = hash12(px * 1.37 + seed) - 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float response = 4.0 * l * (1.0 - l) + 0.25;
  return c + n * amount * response;
}
